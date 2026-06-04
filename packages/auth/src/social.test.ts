import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  SOCIAL_PROVIDERS,
  buildSocialProviders,
  enabledSocialProviders,
} from './social'

const KEYS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_TENANT_ID',
  'APPLE_CLIENT_ID',
  'APPLE_CLIENT_SECRET',
  'APPLE_APP_BUNDLE_IDENTIFIER',
] as const

const snapshot = new Map<string, string | undefined>()

// Isolate each test from the ambient environment: clear all social vars before,
// restore exactly after.
beforeEach(() => {
  snapshot.clear()
  for (const key of KEYS) {
    snapshot.set(key, process.env[key])
    Reflect.deleteProperty(process.env, key)
  }
})

afterEach(() => {
  for (const key of KEYS) {
    const previous = snapshot.get(key)
    if (previous === undefined) Reflect.deleteProperty(process.env, key)
    else process.env[key] = previous
  }
})

describe('buildSocialProviders', () => {
  it('registers nothing when no credentials are set', () => {
    expect(buildSocialProviders()).toEqual({})
    expect(enabledSocialProviders()).toEqual([])
  })

  it('registers a provider only when BOTH id and secret are present', () => {
    process.env['GOOGLE_CLIENT_ID'] = 'google-id'
    expect(buildSocialProviders()).toEqual({})

    process.env['GOOGLE_CLIENT_SECRET'] = 'google-secret'
    expect(buildSocialProviders()).toEqual({
      google: { clientId: 'google-id', clientSecret: 'google-secret' },
    })
    expect(enabledSocialProviders()).toEqual(['google'])
  })

  it('includes the microsoft tenantId only when provided', () => {
    process.env['MICROSOFT_CLIENT_ID'] = 'microsoft-id'
    process.env['MICROSOFT_CLIENT_SECRET'] = 'microsoft-secret'
    expect(buildSocialProviders().microsoft).toEqual({
      clientId: 'microsoft-id',
      clientSecret: 'microsoft-secret',
    })

    process.env['MICROSOFT_TENANT_ID'] = 'tenant'
    expect(buildSocialProviders().microsoft).toEqual({
      clientId: 'microsoft-id',
      clientSecret: 'microsoft-secret',
      tenantId: 'tenant',
    })
  })

  it('includes the apple appBundleIdentifier only when provided', () => {
    process.env['APPLE_CLIENT_ID'] = 'apple-id'
    process.env['APPLE_CLIENT_SECRET'] = 'apple-secret'
    expect(buildSocialProviders().apple).toEqual({
      clientId: 'apple-id',
      clientSecret: 'apple-secret',
    })

    process.env['APPLE_APP_BUNDLE_IDENTIFIER'] = 'com.app'
    expect(buildSocialProviders().apple).toEqual({
      clientId: 'apple-id',
      clientSecret: 'apple-secret',
      appBundleIdentifier: 'com.app',
    })
  })

  it('enables several providers and reports only known names', () => {
    process.env['GOOGLE_CLIENT_ID'] = 'g'
    process.env['GOOGLE_CLIENT_SECRET'] = 'g'
    process.env['FACEBOOK_CLIENT_ID'] = 'f'
    process.env['FACEBOOK_CLIENT_SECRET'] = 'f'

    const enabled = enabledSocialProviders().sort((a, b) => a.localeCompare(b))
    expect(enabled).toEqual(['facebook', 'google'])
    for (const provider of enabled) {
      expect(SOCIAL_PROVIDERS).toContain(provider)
    }
  })
})
