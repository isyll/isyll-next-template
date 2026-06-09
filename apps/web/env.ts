import { createEnv } from '@t3-oss/env-nextjs'
import * as z from 'zod'

/**
 * Validated, typed environment. Import `env` instead of reading `process.env`.
 * Server vars are read from `process.env` automatically; client vars
 * (NEXT_PUBLIC_*) must be listed in `experimental__runtimeEnv` so Next inlines
 * them. Set `SKIP_ENV_VALIDATION=1` for builds where env is unavailable.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Set by Next per bundle; used by instrumentation.ts to pick the runtime.
    NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    // Redis (ioredis). Backs session storage and distributed rate limiting.
    // Required in production; in dev it falls back to the database (sessions)
    // and an in-process rate limiter. Use `rediss://` for TLS.
    REDIS_URL: z.url().optional(),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'Must be a PostgreSQL connection string'),
    ADMIN_DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'Must be a PostgreSQL connection string')
      .optional(),
    AUTH_USER_SECRET: z
      .string()
      .min(32, 'Must be at least 32 characters')
      .optional(),
    AUTH_USER_URL: z.url().optional(),
    AUTH_ADMIN_SECRET: z
      .string()
      .min(32, 'Must be at least 32 characters')
      .optional(),
    AUTH_ADMIN_URL: z.url().optional(),
    // Content-Security-Policy rollout (proxy.ts / lib/csp.ts). Set
    // CSP_REPORT_ONLY=true to send the policy as `-Report-Only` (logged, not
    // enforced) while you vet it; CSP_REPORT_URI is where the browser POSTs
    // violation reports (absolute URL or a same-origin path like /api/csp-report).
    CSP_REPORT_ONLY: z.stringbool().optional(),
    CSP_REPORT_URI: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    FACEBOOK_CLIENT_ID: z.string().optional(),
    FACEBOOK_CLIENT_SECRET: z.string().optional(),
    MICROSOFT_CLIENT_ID: z.string().optional(),
    MICROSOFT_CLIENT_SECRET: z.string().optional(),
    MICROSOFT_TENANT_ID: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_SECRET: z.string().optional(),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.email().optional(),
    // Object storage (S3-compatible). All required together to enable uploads;
    // S3_ENDPOINT/S3_FORCE_PATH_STYLE are for non-AWS providers (R2, MinIO).
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.url().optional(),
    S3_FORCE_PATH_STYLE: z.stringbool().optional(),
    // Error tracking (Sentry). All optional — absent DSN = Sentry disabled.
    // `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` additionally power the
    // admin monitoring dashboard (read-only API) and source-map upload.
    SENTRY_DSN: z.url().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_API_BASE_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
    // Analytics & search console (set to activate the respective integrations).
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    NEXT_PUBLIC_GTM_ID: z.string().optional(),
    NEXT_PUBLIC_GSC_VERIFICATION: z.string().optional(),
    NEXT_PUBLIC_BING_VERIFICATION: z.string().optional(),
    // Client-side Sentry DSN (absent = browser error tracking disabled).
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID'],
    NEXT_PUBLIC_GTM_ID: process.env['NEXT_PUBLIC_GTM_ID'],
    NEXT_PUBLIC_GSC_VERIFICATION: process.env['NEXT_PUBLIC_GSC_VERIFICATION'],
    NEXT_PUBLIC_BING_VERIFICATION: process.env['NEXT_PUBLIC_BING_VERIFICATION'],
    NEXT_PUBLIC_SENTRY_DSN: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  },
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env['SKIP_ENV_VALIDATION']),
})
