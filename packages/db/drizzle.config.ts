import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load env from the repo root first, then a local override.
config({ path: ['../../.env', '.env'], quiet: true })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ??
      'postgres://postgres:postgres@localhost:5432/app',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
  migrations: {
    table: '__drizzle_migrations',
    schema: 'drizzle',
  },
})
