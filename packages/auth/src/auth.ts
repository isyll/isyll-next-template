import { db, schema } from '@workspace/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'

import { sendAuthEmail } from './email'
import { buildSocialProviders } from './social'

const isProd = process.env['NODE_ENV'] === 'production'
const appUrl = process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000'

/**
 * Server-side BetterAuth instance. BETTER_AUTH_SECRET / BETTER_AUTH_URL are
 * read from the environment by BetterAuth directly. The only API route this
 * needs is the catch-all handler mounted in the app; everything else is server
 * actions / `auth.api.*`.
 */
export const auth = betterAuth({
  appName: 'isyll-next-template',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: false,
  }),
  user: {
    additionalFields: {
      // Role is set server-side only (never accepted from sign-up input).
      role: { type: 'string', input: false },
    },
  },
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
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 5,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
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
  trustedOrigins: [appUrl, 'https://appleid.apple.com'],
  advanced: {
    useSecureCookies: isProd,
    cookiePrefix: 'isyll',
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: isProd,
      httpOnly: true,
    },
  },
  // nextCookies MUST be last so server-action sign-in can set cookies.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
