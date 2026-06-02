import { adminAuthSchema, adminDb } from '@workspace/db/admin'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'

const isProd = process.env['NODE_ENV'] === 'production'
const adminUrl =
  process.env['ADMIN_AUTH_URL'] ??
  process.env['BETTER_AUTH_URL'] ??
  'http://localhost:3000'

// Self-service sign-up is OFF by default. To provision the first administrator,
// run `pnpm auth:create-admin` with ADMIN_ALLOW_SIGNUP=true for that one call.
const allowSignUp = process.env['ADMIN_ALLOW_SIGNUP'] === 'true'

/**
 * Administrator BetterAuth instance, fully separate from the end-user `auth`:
 * its own secret, cookie prefix, database connection (the isolated `admin`
 * schema) and API base path. Email/password only — no social, no public
 * sign-up — with short, strictly stateful sessions. The whole `/admin` surface
 * is additionally blocked at the reverse proxy in production.
 */
export const adminAuth = betterAuth({
  appName: 'admin',
  baseURL: adminUrl,
  basePath: '/admin/api/auth',
  secret: process.env['ADMIN_AUTH_SECRET'] ?? process.env['BETTER_AUTH_SECRET'],
  database: drizzleAdapter(adminDb, {
    provider: 'pg',
    schema: adminAuthSchema,
    usePlural: false,
  }),
  user: {
    additionalFields: {
      role: { type: 'string', input: false, defaultValue: 'admin' },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: !allowSignUp,
    requireEmailVerification: false,
    minPasswordLength: 16,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
  },
  // Short, fully stateful admin sessions: validated against the DB on every
  // request, no signed-cookie cache.
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
