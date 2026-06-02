import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as adminSchema from './schema/admin'

/**
 * Dedicated client for the isolated `admin` schema. It connects with
 * `ADMIN_DATABASE_URL` (role `admin_service`, which has no rights on the public
 * user tables); in single-role development it falls back to `DATABASE_URL`.
 * Server-only — never import from a Client Component.
 */
const connectionString =
  process.env['ADMIN_DATABASE_URL'] ?? process.env['DATABASE_URL']

const globalForAdminDb = globalThis as typeof globalThis & {
  __adminDbPool?: Pool
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
