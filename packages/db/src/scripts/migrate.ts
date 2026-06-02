import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { config } from 'dotenv'
import { Pool, type PoolClient } from 'pg'

config({ path: ['../../.env', '.env'], quiet: true })

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'migrations')
const UP_MARKER = '-- migrate:up'
const DOWN_MARKER = '-- migrate:down'

// Stable, arbitrary key: concurrent runners block on this lock instead of
// racing to apply the same migration twice.
const ADVISORY_LOCK_KEY = 4_021_966

interface Migration {
  version: string
  name: string
  up: string
  down: string
}

/** Parse every `NNNN_name.sql` file into ordered up/down sections. */
function loadMigrations(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  return files.map((file) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    const upIndex = sql.indexOf(UP_MARKER)
    const downIndex = sql.indexOf(DOWN_MARKER)
    if (upIndex === -1 || downIndex === -1 || downIndex < upIndex) {
      throw new Error(
        `Migration ${file} must contain "${UP_MARKER}" then "${DOWN_MARKER}"`
      )
    }
    return {
      version: file.split('_')[0] ?? file,
      name: file.replace(/\.sql$/, ''),
      up: sql.slice(upIndex + UP_MARKER.length, downIndex).trim(),
      down: sql.slice(downIndex + DOWN_MARKER.length).trim(),
    }
  })
}

async function appliedVersions(client: PoolClient): Promise<Set<string>> {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    text PRIMARY KEY,
       name       text NOT NULL,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`
  )
  const { rows } = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations'
  )
  return new Set(rows.map((row) => row.version))
}

/** Run one migration section in a transaction, then record/forget its version. */
async function runStep(
  client: PoolClient,
  sql: string,
  bookkeeping: string,
  params: string[]
): Promise<void> {
  await client.query('BEGIN')
  try {
    if (sql.length > 0) {
      await client.query(sql)
    }
    await client.query(bookkeeping, params)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function migrateUp(client: PoolClient): Promise<void> {
  const applied = await appliedVersions(client)
  const pending = loadMigrations().filter((m) => !applied.has(m.version))
  if (pending.length === 0) {
    console.info('Database is up to date — no pending migrations')
    return
  }
  for (const migration of pending) {
    await runStep(
      client,
      migration.up,
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    )
    console.info(`▲ applied ${migration.name}`)
  }
}

async function migrateDown(client: PoolClient): Promise<void> {
  const applied = await appliedVersions(client)
  const last = [...loadMigrations()]
    .reverse()
    .find((m) => applied.has(m.version))
  if (!last) {
    console.info('No applied migrations to roll back')
    return
  }
  await runStep(
    client,
    last.down,
    'DELETE FROM schema_migrations WHERE version = $1',
    [last.version]
  )
  console.info(`▼ rolled back ${last.name}`)
}

async function migrateStatus(client: PoolClient): Promise<void> {
  const applied = await appliedVersions(client)
  for (const migration of loadMigrations()) {
    console.info(
      `${applied.has(migration.version) ? '[x]' : '[ ]'} ${migration.name}`
    )
  }
}

/** Scaffold the next sequentially-numbered migration file. */
function createMigration(rawName: string | undefined): void {
  if (!rawName) {
    throw new Error('Usage: pnpm db:migrate:new <name>')
  }
  const slug = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  const highest = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .reduce(
      (max, file) =>
        Math.max(max, Number.parseInt(file.split('_')[0] ?? '0', 10) || 0),
      0
    )
  const version = String(highest + 1).padStart(4, '0')
  const target = join(MIGRATIONS_DIR, `${version}_${slug}.sql`)
  writeFileSync(target, `${UP_MARKER}\n\n\n${DOWN_MARKER}\n\n`, { flag: 'wx' })
  console.info(`Created ${target}`)
}

const command = process.argv[2] ?? 'up'

if (command === 'new') {
  createMigration(process.argv[3])
} else {
  // The migration role (least privilege: NOT the app role) owns DDL.
  const connectionString =
    process.env['MIGRATION_DATABASE_URL'] ?? process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is required')
  }

  const pool = new Pool({ connectionString, max: 1 })
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY])
    if (command === 'up') {
      await migrateUp(client)
    } else if (command === 'down') {
      await migrateDown(client)
    } else if (command === 'status') {
      await migrateStatus(client)
    } else {
      throw new Error(
        `Unknown command "${command}" (use up | down | status | new)`
      )
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY])
    client.release()
    await pool.end()
  }
}
