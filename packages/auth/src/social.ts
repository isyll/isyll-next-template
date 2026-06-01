import type { BetterAuthOptions } from 'better-auth'

/**
 * Social providers, gated purely by environment presence. A provider whose
 * credentials are absent is simply never registered, so the same codebase runs
 * with zero, some, or all providers enabled. The login UI renders only the
 * buttons returned by {@link enabledSocialProviders}.
 *
 * Apple expects a PRE-GENERATED client secret JWT in `APPLE_CLIENT_SECRET`
 * (BetterAuth 1.6 does not ship a secret generator).
 */
type SocialProviders = NonNullable<BetterAuthOptions['socialProviders']>

export const SOCIAL_PROVIDERS = [
  'google',
  'facebook',
  'microsoft',
  'apple',
] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

export function buildSocialProviders(): SocialProviders {
  const env = process.env
  const providers: SocialProviders = {}

  const googleId = env['GOOGLE_CLIENT_ID']
  const googleSecret = env['GOOGLE_CLIENT_SECRET']
  if (googleId && googleSecret) {
    providers.google = { clientId: googleId, clientSecret: googleSecret }
  }

  const facebookId = env['FACEBOOK_CLIENT_ID']
  const facebookSecret = env['FACEBOOK_CLIENT_SECRET']
  if (facebookId && facebookSecret) {
    providers.facebook = { clientId: facebookId, clientSecret: facebookSecret }
  }

  const microsoftId = env['MICROSOFT_CLIENT_ID']
  const microsoftSecret = env['MICROSOFT_CLIENT_SECRET']
  if (microsoftId && microsoftSecret) {
    const tenantId = env['MICROSOFT_TENANT_ID']
    providers.microsoft = {
      clientId: microsoftId,
      clientSecret: microsoftSecret,
      ...(tenantId ? { tenantId } : {}),
    }
  }

  const appleId = env['APPLE_CLIENT_ID']
  const appleSecret = env['APPLE_CLIENT_SECRET']
  if (appleId && appleSecret) {
    const bundleId = env['APPLE_APP_BUNDLE_IDENTIFIER']
    providers.apple = {
      clientId: appleId,
      clientSecret: appleSecret,
      ...(bundleId ? { appBundleIdentifier: bundleId } : {}),
    }
  }

  return providers
}

/** Provider names whose credentials are present — drives the login UI. */
export function enabledSocialProviders(): SocialProvider[] {
  return Object.keys(buildSocialProviders()).filter(
    (name): name is SocialProvider =>
      (SOCIAL_PROVIDERS as readonly string[]).includes(name)
  )
}
