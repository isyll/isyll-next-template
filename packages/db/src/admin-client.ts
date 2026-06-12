import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { createTransactional } from './lib/transaction'
import * as adminSchema from './schema/admin'

/**
 * Dedicated client for the isolated `admin` schema. It connects with
 * `ADMIN_DATABASE_URL` (role `admin_service`, which has no rights on the public
 * user tables); in single-role development it falls back to `DATABASE_URL`.
 * Server-only — never import from a Client Component.
 *
 * Read replicas: set `ADMIN_DATABASE_REPLICA_URL` to route standalone admin
 * reads (`adminDbRead` / `getAdminReadDb()`) to a follower; unset, it is the
 * primary `adminDb`.
 */
const connectionString =
  process.env['ADMIN_DATABASE_URL'] ?? process.env['DATABASE_URL']
const replicaConnectionString = process.env['ADMIN_DATABASE_REPLICA_URL']

const globalForAdminDb = globalThis as typeof globalThis & {
  __adminDbPool?: Pool
  __adminDbReplicaPool?: Pool
}

const pool =
  globalForAdminDb.__adminDbPool ??
  new Pool(connectionString ? { connectionString, max: 5 } : { max: 5 })

if (process.env['NODE_ENV'] !== 'production') {
  globalForAdminDb.__adminDbPool = pool
}

export const adminDb = drizzle({
  client: pool,
  schema: adminSchema,
  casing: 'snake_case',
  logger: process.env['NODE_ENV'] === 'development',
})

export type AdminDB = typeof adminDb

/** Read-only admin client; falls back to the primary when no replica is set. */
const replicaPool = replicaConnectionString
  ? (globalForAdminDb.__adminDbReplicaPool ??
    new Pool({ connectionString: replicaConnectionString, max: 5 }))
  : pool

if (replicaConnectionString && process.env['NODE_ENV'] !== 'production') {
  globalForAdminDb.__adminDbReplicaPool = replicaPool
}

export const adminDbRead: AdminDB = replicaConnectionString
  ? drizzle({
      client: replicaPool,
      schema: adminSchema,
      casing: 'snake_case',
      logger: process.env['NODE_ENV'] === 'development',
    })
  : adminDb

/**
 * Transaction helpers for the isolated admin database. Mirrors the end-user
 * `withTransaction` / `getDb` / `getReadDb`, on the `admin_service` connection.
 */
export const {
  getDb: getAdminDb,
  getReadDb: getAdminReadDb,
  withTransaction: withAdminTransaction,
} = createTransactional(adminDb, adminDbRead)
