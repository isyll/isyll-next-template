import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { reset, seed } from 'drizzle-seed'
import { Pool } from 'pg'

import * as schema from '../schema'

config({ path: ['../../.env', '.env'], quiet: true })

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database')
}
if (process.env['NODE_ENV'] === 'production') {
  throw new Error('Refusing to seed: NODE_ENV is production')
}

const pool = new Pool({ connectionString, max: 1 })
const db = drizzle({ client: pool, schema })

// `reset` truncates every table (FK-safe); seed only the domain tables —
// auth tables are populated through the BetterAuth sign-up flow.
const seedSchema = { user: schema.user, post: schema.post }
await reset(db, schema)
await seed(db, seedSchema)
await pool.end()

console.info('✅ Database seeded')
