import { parseEnv } from '@workspace/core/env'
import * as z from 'zod'

/**
 * Auth-related environment. All social credentials are optional — a missing
 * pair simply disables that provider. BetterAuth itself reads
 * BETTER_AUTH_SECRET / BETTER_AUTH_URL directly from the environment.
 */
export const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters')
    .optional(),
  BETTER_AUTH_URL: z.url().optional(),

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
})

export type AuthEnv = z.infer<typeof authEnvSchema>

export function getAuthEnv(): AuthEnv {
  return parseEnv(authEnvSchema)
}
