import 'server-only'

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
 *
 * Read replicas: set `DATABASE_REPLICA_URL` to route standalone reads (via
 * `dbRead` / `getReadDb()`) to a follower while writes and transactions stay on
 * the primary `db`. When it is unset, `dbRead` IS `db`, so the default
 * single-database setup is unchanged.
 */
const connectionString = process.env['DATABASE_URL']
const replicaConnectionString = process.env['DATABASE_REPLICA_URL']

const globalForDb = globalThis as typeof globalThis & {
  __dbPool?: Pool
  __dbReplicaPool?: Pool
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
 * Read-only client backed by a replica pool. Falls back to the primary `db`
 * when `DATABASE_REPLICA_URL` is unset, so callers never need to branch.
 */
const replicaPool = replicaConnectionString
  ? (globalForDb.__dbReplicaPool ??
    new Pool({ connectionString: replicaConnectionString, max: 10 }))
  : pool

if (replicaConnectionString && process.env['NODE_ENV'] !== 'production') {
  globalForDb.__dbReplicaPool = replicaPool
}

export const dbRead: DB = replicaConnectionString
  ? drizzle({
      client: replicaPool,
      schema,
      casing: 'snake_case',
      logger: process.env['NODE_ENV'] === 'development',
    })
  : db

/**
 * Transaction helpers for the end-user database. Use `withTransaction` to run
 * atomic, audited business logic, `getDb()` inside DAL write helpers so they
 * join an enclosing transaction, and `getReadDb()` for standalone reads (routed
 * to the replica outside a transaction). See `createTransactional`.
 */
export const { getDb, getReadDb, withTransaction } = createTransactional(
  db,
  dbRead
)
