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
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    // Optional: when both are set, rate limiting uses Upstash Redis; otherwise
    // it falls back to an in-process limiter (fine for dev / single instance).
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
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
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  },
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env['SKIP_ENV_VALIDATION']),
})
