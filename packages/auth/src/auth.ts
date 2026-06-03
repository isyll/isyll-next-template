import { db, schema } from '@workspace/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'

import { sendAuthEmail } from './email'
import { buildSocialProviders } from './social'

const isProd = process.env['NODE_ENV'] === 'production'
const userUrl = process.env['AUTH_USER_URL'] ?? 'http://localhost:3000'

/**
 * End-user BetterAuth instance. Completely separate from `adminAuth`
 * (`@workspace/auth/admin`): its own secret (AUTH_USER_SECRET), URL, cookies
 * and database tables. The only API route it needs is the catch-all handler
 * mounted at /api/auth; everything else goes through server actions /
 * `userAuth.api.*`.
 */
export const userAuth = betterAuth({
  appName: 'App',
  baseURL: userUrl,
  secret: process.env['AUTH_USER_SECRET'],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      sendAuthEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Reset your password: ${url}`,
      }),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: ({ user, url }) =>
      sendAuthEmail({
        to: user.email,
        subject: 'Verify your email',
        text: `Verify your email: ${url}`,
      }),
  },
  socialProviders: buildSocialProviders(),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'microsoft', 'apple'],
    },
  },
  // Classic stateful sessions: the cookie holds only an opaque token and the
  // session row is read from the database on every request (cookieCache off),
  // so sign-out / revocation takes effect immediately. No JWT, no bearer
  // access/refresh tokens. Long-lived and rolling, like a typical website.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24 * 7,
    freshAge: 60 * 60,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 3 },
    },
  },
  trustedOrigins: [userUrl, 'https://appleid.apple.com'],
  advanced: {
    useSecureCookies: isProd,
    cookiePrefix: 'app',
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: isProd,
      httpOnly: true,
    },
  },
  // nextCookies MUST be last so server-action sign-in can set cookies.
  plugins: [nextCookies()],
})

export type UserSession = typeof userAuth.$Infer.Session
