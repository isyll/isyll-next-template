import { adminAuthSchema, adminDb } from '@workspace/db/admin'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'

import { createAuthRedisStorage } from './redis'

const isProd = process.env['NODE_ENV'] === 'production'
const adminUrl = process.env['AUTH_ADMIN_URL'] ?? 'http://localhost:3000'

/**
 * Operator (administrator) BetterAuth instance, fully separate from the
 * end-user `userAuth`: its own secret (AUTH_ADMIN_SECRET), URL, cookie prefix
 * and database (the isolated `admin` schema via `adminDb`).
 *
 * Operators are provisioned out of band (`pnpm admin:create-operator`, or an
 * LDAP/AD bridge later) — never self-service. Self sign-up is disabled, there
 * is no social login, and sessions are short and strictly stateful. The whole
 * /admin surface is additionally blocked at the reverse proxy in production.
 * Authorization is permission-based (PBAC); this instance only authenticates.
 */
export const adminAuth = betterAuth({
  appName: 'Admin Console',
  baseURL: adminUrl,
  basePath: '/admin/api/auth',
  secret: process.env['AUTH_ADMIN_SECRET'],
  database: drizzleAdapter(adminDb, {
    provider: 'pg',
    schema: adminAuthSchema,
    usePlural: false,
  }),
  user: {
    additionalFields: {
      // Deactivated operators keep their row but are rejected by the action
      // clients and admin pages. Set server-side only.
      isActive: { type: 'boolean', input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 16,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
  },
  // Operator sessions are stored exclusively in Redis with a short TTL.
  // See notes in auth.ts; same strategy applies.
  secondaryStorage: createAuthRedisStorage('admin'),
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
    freshAge: 60 * 10,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
    },
  },
  trustedOrigins: [adminUrl],
  advanced: {
    useSecureCookies: isProd,
    cookiePrefix: 'admin',
    defaultCookieAttributes: {
      sameSite: 'strict',
      secure: isProd,
      httpOnly: true,
    },
  },
  plugins: [nextCookies()],
})

export type AdminSession = typeof adminAuth.$Infer.Session
