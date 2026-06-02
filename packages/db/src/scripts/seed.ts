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

// `reset` truncates every table (FK-safe). Seeded users are sample rows only:
// real accounts (with credentials) are created through the BetterAuth sign-up
// flow, which also populates the `account`/`session` tables. `email` is refined
// so generated values satisfy the `email_address` domain CHECK.
await reset(db, schema)
await seed(db, { user: schema.user }).refine((funcs) => ({
  user: {
    columns: {
      email: funcs.email(),
      name: funcs.fullName(),
    },
  },
}))
await pool.end()

console.info('✅ Database seeded')
