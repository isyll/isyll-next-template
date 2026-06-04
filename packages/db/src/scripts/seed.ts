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

// Only the `users` table is reset/seeded: reference tables hold immutable
// standards data from the migrations, and real accounts (with credentials) are
// created through the BetterAuth sign-up flow. `email` is refined so generated
// values satisfy the `email_address` domain CHECK.
await reset(db, { users: schema.users })
await seed(db, { users: schema.users }).refine((funcs) => ({
  users: {
    columns: {
      email: funcs.email(),
      name: funcs.fullName(),
    },
  },
}))
await pool.end()

console.info('✅ Database seeded')
