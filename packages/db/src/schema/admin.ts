import { boolean, pgSchema, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Administrator identity, deliberately isolated from end users. These tables
 * live in a dedicated `admin` Postgres schema, are reached through a separate
 * connection (`ADMIN_DATABASE_URL`, role `admin_service`) and back a separate
 * BetterAuth instance. The authoritative DDL is the pure-SQL migration
 * `migrations/0004_admin.sql`; this Drizzle mapping must mirror it.
 */
export const adminSchema = pgSchema('admin')

/** Closed set of admin privilege levels (Postgres ENUM `admin.admin_role`). */
export const adminRole = adminSchema.enum('admin_role', [
  'super_admin',
  'admin',
])

export const adminUser = adminSchema.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(true),
  image: text('image'),
  role: adminRole('role').notNull().default('admin'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminSession = adminSchema.table('session', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => adminUser.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminAccount = adminSchema.table('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => adminUser.id, { onDelete: 'cascade' }),
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
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminVerification = adminSchema.table('verification', {
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
})

/** Schema map consumed by the admin BetterAuth drizzle adapter. */
export const adminAuthSchema = {
  user: adminUser,
  session: adminSession,
  account: adminAccount,
  verification: adminVerification,
}
