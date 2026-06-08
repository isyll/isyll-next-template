/**
 * Pure-SQL migration runner (Node.js, zero external binaries).
 *
 * Replaces golang-migrate: migrations are the same paired files under
 * `packages/db/migrations/` named `NNNNNN_description.up.sql` / `.down.sql`,
 * applied here through `pg`. State is tracked in `public.schema_migrations`
 * (one row per applied migration). Each step runs in its own transaction so a
 * failure rolls back cleanly — add `-- migrate:no-transaction` as the first
 * line of a file for statements that cannot run inside one (e.g.
 * `CREATE INDEX CONCURRENTLY`). A session advisory lock serializes concurrent
 * runners.
 *
 * Usage:
 *   tsx migrate.ts up [n]        apply all (or the next n) pending migrations
 *   tsx migrate.ts down [n]      roll back the last n applied migrations (n=1)
 *   tsx migrate.ts status        show current version and pending count
 *   tsx migrate.ts new <name>    scaffold the next numbered up/down pair
 *   tsx migrate.ts force <ver>   mark the DB at <ver> without running SQL
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { config } from 'dotenv'
import { Client } from 'pg'

config({ path: ['../../.env', '.env'], quiet: true })

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'migrations')
const VERSION_DIGITS = 6
const NO_TRANSACTION = '-- migrate:no-transaction'
/** Arbitrary fixed key so concurrent runners serialize on one advisory lock. */
const ADVISORY_LOCK_KEY = 4_011_972

interface Migration {
  /** Zero-padded numeric prefix, e.g. "000007". */
  version: string
  /** Description slug after the prefix, e.g. "create_users". */
  name: string
}

const FILE_RE = /^(\d+)_(.+)\.(up|down)\.sql$/

/** Discover every migration pair on disk, sorted by version ascending. */
function loadMigrations(): Migration[] {
  const versions = new Map<string, string>()
  for (const file of readdirSync(MIGRATIONS_DIR)) {
    const match = FILE_RE.exec(file)
    if (match?.[1] && match[2]) versions.set(match[1], match[2])
  }
  return [...versions.entries()]
    .map(([version, name]) => ({ version, name }))
    .sort((a, b) => a.version.localeCompare(b.version))
}

function fileFor(migration: Migration, direction: 'up' | 'down'): string {
  return join(
    MIGRATIONS_DIR,
    `${migration.version}_${migration.name}.${direction}.sql`
  )
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function connect(): Promise<Client> {
  const connectionString =
    process.env['MIGRATION_DATABASE_URL'] ?? process.env['DATABASE_URL']
  if (!connectionString) {
    fail('MIGRATION_DATABASE_URL or DATABASE_URL is required')
  }
  const client = new Client({ connectionString })
  await client.connect()
  return client
}

async function ensureTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version    text        PRIMARY KEY,
      name       text        NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function appliedVersions(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ version: string }>(
    'SELECT version FROM public.schema_migrations ORDER BY version'
  )
  return new Set(rows.map((row) => row.version))
}

/** Run one migration step and record/forget it, atomically when possible. */
async function step(
  client: Client,
  migration: Migration,
  direction: 'up' | 'down'
): Promise<void> {
  const sql = readFileSync(fileFor(migration, direction), 'utf8')
  const record =
    direction === 'up'
      ? {
          text: 'INSERT INTO public.schema_migrations (version, name) VALUES ($1, $2)',
          values: [migration.version, migration.name],
        }
      : {
          text: 'DELETE FROM public.schema_migrations WHERE version = $1',
          values: [migration.version],
        }

  if (sql.startsWith(NO_TRANSACTION)) {
    await client.query(sql)
    await client.query(record.text, record.values)
  } else {
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query(record.text, record.values)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  console.info(`${arrow} ${migration.version}_${migration.name}`)
}

async function withLock(
  client: Client,
  work: () => Promise<void>
): Promise<void> {
  await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY])
  try {
    await work()
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY])
  }
}

async function up(client: Client, count?: number): Promise<void> {
  const applied = await appliedVersions(client)
  const pending = loadMigrations().filter((m) => !applied.has(m.version))
  const todo = count === undefined ? pending : pending.slice(0, count)
  if (todo.length === 0) {
    console.info('Already up to date.')
    return
  }
  for (const migration of todo) await step(client, migration, 'up')
  console.info(`Applied ${todo.length} migration(s).`)
}

async function down(client: Client, count: number): Promise<void> {
  const applied = await appliedVersions(client)
  const reversible = loadMigrations()
    .filter((m) => applied.has(m.version))
    .reverse()
    .slice(0, count)
  if (reversible.length === 0) {
    console.info('Nothing to roll back.')
    return
  }
  for (const migration of reversible) await step(client, migration, 'down')
  console.info(`Rolled back ${reversible.length} migration(s).`)
}

async function status(client: Client): Promise<void> {
  const applied = await appliedVersions(client)
  const all = loadMigrations()
  const current = all.filter((m) => applied.has(m.version)).at(-1)
  const pending = all.filter((m) => !applied.has(m.version))
  console.info(`Current version: ${current?.version ?? '(none)'}`)
  console.info(`Applied: ${applied.size} · Pending: ${pending.length}`)
  for (const migration of pending) {
    console.info(`  pending ${migration.version}_${migration.name}`)
  }
}

/**
 * Reconcile the recorded state with `target` without running any SQL — the
 * recovery path after a manual fix. Marks every migration up to and including
 * `target` as applied and forgets anything above it.
 */
async function force(client: Client, target: string): Promise<void> {
  const version = target.padStart(VERSION_DIGITS, '0')
  const all = loadMigrations()
  if (!all.some((m) => m.version === version)) {
    fail(`No migration found for version ${version}`)
  }
  await client.query('BEGIN')
  try {
    await client.query(
      'DELETE FROM public.schema_migrations WHERE version > $1',
      [version]
    )
    for (const migration of all.filter((m) => m.version <= version)) {
      await client.query(
        `INSERT INTO public.schema_migrations (version, name) VALUES ($1, $2)
         ON CONFLICT (version) DO NOTHING`,
        [migration.version, migration.name]
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
  console.info(`Forced version to ${version}.`)
}

function toSnake(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Scaffold the next numbered up/down pair (no DB connection needed). */
function scaffold(rawName: string): void {
  const name = toSnake(rawName)
  if (!name) fail('Usage: pnpm db:migrate:new <name>')
  const existing = loadMigrations()
  const last = existing.at(-1)?.version ?? '0'.repeat(VERSION_DIGITS)
  const next = String(Number(last) + 1).padStart(VERSION_DIGITS, '0')
  for (const direction of ['up', 'down'] as const) {
    const path = join(MIGRATIONS_DIR, `${next}_${name}.${direction}.sql`)
    writeFileSync(path, `-- ${next}_${name} (${direction})\n`)
    console.info(`created ${path}`)
  }
}

async function main(): Promise<void> {
  const [action = 'up', ...rest] = process.argv.slice(2)

  if (action === 'new') {
    scaffold(rest[0] ?? '')
    return
  }

  const client = await connect()
  try {
    await ensureTable(client)
    switch (action) {
      case 'up':
        await withLock(client, () =>
          up(client, rest[0] ? Number(rest[0]) : undefined)
        )
        break
      case 'down':
        await withLock(client, () => down(client, Number(rest[0] ?? '1')))
        break
      case 'status':
      case 'version':
        await status(client)
        break
      case 'force': {
        const version = rest[0]
        if (!version) fail('Usage: pnpm db:migrate force <version>')
        await withLock(client, () => force(client, version))
        break
      }
      default:
        fail(
          `Unknown action "${action}" (use up | down | status | force | new)`
        )
    }
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
