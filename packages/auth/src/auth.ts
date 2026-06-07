import { DEFAULT_LOCALE, resolveLocale, type AppLocale } from '@workspace/core'
import { db, publishEvent, schema } from '@workspace/db'
import {
  sendPasswordReset,
  sendRegistrationConfirmation,
} from '@workspace/email'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'

import { hashPassword, verifyPassword } from './password'
import { createAuthRedisStorage } from './redis'
import { buildSocialProviders } from './social'

const isProd = process.env['NODE_ENV'] === 'production'
const userUrl = process.env['AUTH_USER_URL'] ?? 'http://localhost:3000'

/** Product name shown in emails. `pnpm project:init` rewrites this constant. */
const APP_NAME = 'App'

/** Read the visitor's preferred locale from the request's NEXT_LOCALE cookie. */
function localeFromHeaders(headers: Headers | undefined): AppLocale {
  const cookie = headers?.get('cookie')
  const match = cookie ? /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(cookie) : null
  return resolveLocale(match?.[1] ? decodeURIComponent(match[1]) : undefined)
}

/** The user's stored `language` (an additionalField), coerced to a locale. */
function userLocale(user: object): AppLocale {
  const language = (user as { language?: unknown }).language
  return resolveLocale(typeof language === 'string' ? language : undefined)
}

/**
 * End-user BetterAuth instance. Completely separate from `adminAuth`
 * (`@workspace/auth/admin`): its own secret (AUTH_USER_SECRET), URL, cookies
 * and database tables. The only API route it needs is the catch-all handler
 * mounted at /api/auth; everything else goes through server actions /
 * `userAuth.api.*`.
 *
 * Transactional emails are localized to the user's `language` (stored on the
 * user, captured from the request locale at sign-up) and rendered with
 * `@workspace/email`.
 */
export const userAuth = betterAuth({
  appName: APP_NAME,
  baseURL: userUrl,
  secret: process.env['AUTH_USER_SECRET'],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  user: {
    additionalFields: {
      // Preferred locale; set server-side from the request, never user input.
      language: { type: 'string', input: false, defaultValue: DEFAULT_LOCALE },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Capture the visitor's locale at sign-up so later emails are localized.
        before: (user, context) =>
          Promise.resolve({
            data: { ...user, language: localeFromHeaders(context?.headers) },
          }),
        // Publish a domain event (transactional outbox) so the app can react —
        // e.g. a welcome notification. Best-effort: BetterAuth manages its own
        // write, so this runs outside our transaction.
        after: async (user) => {
          try {
            await publishEvent({
              type: 'user.registered',
              userId: user.id,
              email: user.email,
              name: user.name,
            })
          } catch (error) {
            console.error('[auth] failed to publish user.registered', error)
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    // Argon2id instead of the default scrypt (see ./password).
    password: { hash: hashPassword, verify: verifyPassword },
    sendResetPassword: ({ user, url }) =>
      sendPasswordReset(user.email, {
        resetUrl: url,
        appName: APP_NAME,
        locale: userLocale(user),
      }),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: ({ user, url }) =>
      sendRegistrationConfirmation(user.email, {
        name: user.name,
        verificationUrl: url,
        appName: APP_NAME,
        locale: userLocale(user),
      }),
  },
  socialProviders: buildSocialProviders(),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'microsoft', 'apple'],
    },
  },
  // Sessions are stored exclusively in Redis (fast TTL-based lookup).
  // `storeSessionInDatabase` is intentionally omitted (defaults to falsy when
  // `secondaryStorage` is provided) so the `app.sessions` table is not written
  // to. The sessions table exists as a no-op fallback; in dev without Redis it
  // gracefully falls back to the Drizzle adapter.
  secondaryStorage: createAuthRedisStorage('user'),
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
