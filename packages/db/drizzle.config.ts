import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load env from the repo root first, then a local override.
config({ path: ['../../.env', '.env'], quiet: true })

// drizzle-kit is kept ONLY for `db:studio` (schema browser). Schema changes are
// applied through the pure-SQL migrations in ./migrations via the runner in
// src/scripts/migrate.ts — drizzle-kit generate/push are intentionally unused.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ??
      'postgres://postgres:postgres@localhost:5432/app',
  },
  casing: 'snake_case',
})
