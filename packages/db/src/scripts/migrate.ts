import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

config({ path: ['../../.env', '.env'], quiet: true })

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations')
}

// Migrations run in a single session — use a single-connection pool.
const pool = new Pool({ connectionString, max: 1 })
const db = drizzle({ client: pool })

await migrate(db, { migrationsFolder: './drizzle' })
await pool.end()

console.info('✅ Migrations applied')
