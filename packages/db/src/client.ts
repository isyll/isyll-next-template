import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { createTransactional } from './lib/transaction'
import * as schema from './schema'

/**
 * Database client (node-postgres pool + Drizzle).
 *
 * Server-only: never import this from a Client Component. `pg` is a Node
 * built-in-dependent module and would fail to bundle for the browser anyway,
 * but the convention is to access `db` exclusively from Server Components,
 * Server Actions and route handlers.
 *
 * The pool is cached on `globalThis` in non-production so Next.js hot-reload
 * does not exhaust Postgres connections. Connection is lazy — importing this
 * module does not require `DATABASE_URL` (so offline schema codegen works).
 */
const connectionString = process.env['DATABASE_URL']

const globalForDb = globalThis as typeof globalThis & {
  __dbPool?: Pool
}

const pool =
  globalForDb.__dbPool ??
  new Pool(connectionString ? { connectionString, max: 10 } : { max: 10 })

if (process.env['NODE_ENV'] !== 'production') {
  globalForDb.__dbPool = pool
}

export const db = drizzle({
  client: pool,
  schema,
  casing: 'snake_case',
  logger: process.env['NODE_ENV'] === 'development',
})

export type DB = typeof db

/**
 * Transaction helpers for the end-user database. Use `withTransaction` to run
 * atomic, audited business logic and `getDb()` inside DAL helpers so they join
 * an enclosing transaction. See `createTransactional`.
 */
export const { getDb, withTransaction } = createTransactional(db)
