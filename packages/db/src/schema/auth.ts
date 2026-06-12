import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  unique,
} from 'drizzle-orm/pg-core'

import { softDelete } from './_helpers'

/**
 * End-user site data lives in its own `app` Postgres schema (isolated from the
 * global reference data in `public` and the operators in `admin`). Every object
 * is schema-qualified.
 *
 * BetterAuth core schema (provider: pg, usePlural: true) for end users. This is
 * the Drizzle mapping the ORM/BetterAuth adapter queries against; the
 * authoritative DDL lives in the pure-SQL migrations under `migrations/`. The
 * two MUST stay in sync. Table names are plural; column names are derived as
 * snake_case by the client's `casing` option.
 *
 * Sessions are stored in Redis (not PostgreSQL) when `REDIS_URL` is set —
 * `storeSessionInDatabase` is not set in the BetterAuth config. When Redis is
 * absent, `secondaryStorage` is `undefined` and BetterAuth persists sessions in
 * the `app.sessions` table via the Drizzle adapter (the no-Redis dev fallback).
 *
 * `access_token` / `refresh_token` / `id_token` in the accounts table are
 * OAUTH PROVIDER TOKENS (e.g. a Google access token) — they are NOT application
 * JWTs. Application sessions are opaque tokens stored in Redis.
 */
export const appSchema = pgSchema('app')

export const users = appSchema.table(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    // Preferred language (BCP-47 short code); drives localized emails. Set
    // server-side from the request locale at sign-up — see the `language`
    // additionalField + create hook in `@workspace/auth`.
    language: text('language').notNull().default('fr'),
    ...softDelete,
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Email is unique only among live rows; freed once an account is deleted.
    uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
    // The migration also defines a generated `search_vector tsvector` column
    // with a GIN index (`users_search_idx`) and a pg_trgm GIN index on `name`
    // (`users_name_trgm_idx`) for full-text + typo-tolerant search. Those are
    // not modelled here (Drizzle lacks first-class tsvector/operator-class
    // support); see migration 000007 and `apps/web/lib/search.ts`.
  ]
)

/**
 * Sessions table retained for BetterAuth adapter compatibility (schema
 * introspection). The application does NOT read/write sessions here; sessions
 * live in Redis via `secondaryStorage`. This table is intentionally empty in
 * normal operation.
 */
export const sessions = appSchema.table('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const accounts = appSchema.table(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // OAuth provider tokens — null for email+password accounts.
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    // Hashed password for the 'credential' provider; null for social accounts.
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('accounts_provider_account_unique').on(
      table.providerId,
      table.accountId
    ),
    index('accounts_user_id_idx').on(table.userId),
  ]
)

export const verifications = appSchema.table(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('verifications_identifier_idx').on(table.identifier),
    index('verifications_expires_at_idx').on(table.expiresAt),
  ]
)
