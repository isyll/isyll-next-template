import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

import { config } from 'dotenv'

config({ path: ['../../.env', '.env'], quiet: true })

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'migrations')

/** Invoke the golang-migrate binary, surfacing a clear error if it is absent. */
function migrate(args: readonly string[]): never {
  const result = spawnSync('migrate', args, { stdio: 'inherit' })
  if (result.error) {
    console.error(
      'golang-migrate is not installed. Install it ' +
        '(https://github.com/golang-migrate/migrate) or run migrations through ' +
        'Docker: `docker compose -f compose.prod.yaml run --rm migrator`.'
    )
    process.exit(1)
  }
  process.exit(result.status ?? 0)
}

const [action = 'up', ...rest] = process.argv.slice(2)

if (action === 'new') {
  const name = rest[0]
  if (!name) {
    console.error('Usage: pnpm db:migrate:new <name>')
    process.exit(1)
  }
  migrate([
    'create',
    '-ext',
    'sql',
    '-dir',
    MIGRATIONS_DIR,
    '-seq',
    '-digits',
    '6',
    name,
  ])
}

const databaseUrl =
  process.env['MIGRATION_DATABASE_URL'] ?? process.env['DATABASE_URL']
if (!databaseUrl) {
  console.error('MIGRATION_DATABASE_URL or DATABASE_URL is required')
  process.exit(1)
}

const base = ['-path', MIGRATIONS_DIR, '-database', databaseUrl]

if (action === 'up') {
  migrate([...base, 'up'])
} else if (action === 'down') {
  migrate([...base, 'down', rest[0] ?? '1'])
} else if (action === 'version') {
  migrate([...base, 'version'])
} else if (action === 'force') {
  const version = rest[0]
  if (!version) {
    console.error('Usage: pnpm db:migrate force <version>')
    process.exit(1)
  }
  migrate([...base, 'force', version])
} else {
  console.error(
    `Unknown action "${action}" (use up | down | version | force | new)`
  )
  process.exit(1)
}
