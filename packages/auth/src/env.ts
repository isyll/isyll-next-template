import { parseEnv } from '@workspace/core/env'
import * as z from 'zod'

/**
 * Auth-related environment. All social credentials are optional — a missing
 * pair simply disables that provider. The admin instance is configured
 * independently (own secret + URL) so a compromised user secret never grants
 * admin access.
 */
export const authEnvSchema = z.object({
  AUTH_USER_SECRET: z
    .string()
    .min(32, 'AUTH_USER_SECRET must be at least 32 characters')
    .optional(),
  AUTH_USER_URL: z.url().optional(),

  AUTH_ADMIN_SECRET: z
    .string()
    .min(32, 'AUTH_ADMIN_SECRET must be at least 32 characters')
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

  // Transactional email (Resend). Absent in dev → emails log to the console.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.email().optional(),
})

export type AuthEnv = z.infer<typeof authEnvSchema>

export function getAuthEnv(): AuthEnv {
  return parseEnv(authEnvSchema)
}
