import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mutable env stub so we can flip Sentry config on/off per test.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    SENTRY_AUTH_TOKEN: undefined as string | undefined,
    SENTRY_ORG: undefined as string | undefined,
    SENTRY_PROJECT: undefined as string | undefined,
    SENTRY_API_BASE_URL: undefined as string | undefined,
  },
}))
vi.mock('@/env', () => ({ env: mockEnv }))

import { monitoringConfig } from '@/features/admin-monitoring/sentry-api'

describe('monitoringConfig', () => {
  beforeEach(() => {
    mockEnv.SENTRY_AUTH_TOKEN = undefined
    mockEnv.SENTRY_ORG = undefined
    mockEnv.SENTRY_PROJECT = undefined
    mockEnv.SENTRY_API_BASE_URL = undefined
  })

  it('is disabled unless token + org + project are all set', () => {
    expect(monitoringConfig().enabled).toBe(false)
    mockEnv.SENTRY_AUTH_TOKEN = 'token'
    mockEnv.SENTRY_ORG = 'acme'
    expect(monitoringConfig().enabled).toBe(false)
  })

  it('is enabled and builds an issues URL when fully configured', () => {
    mockEnv.SENTRY_AUTH_TOKEN = 'token'
    mockEnv.SENTRY_ORG = 'acme'
    mockEnv.SENTRY_PROJECT = 'web'
    const config = monitoringConfig()
    expect(config.enabled).toBe(true)
    expect(config.issuesUrl).toBe(
      'https://sentry.io/organizations/acme/issues/?project=web'
    )
  })

  it('honors a self-hosted base URL', () => {
    mockEnv.SENTRY_AUTH_TOKEN = 'token'
    mockEnv.SENTRY_ORG = 'acme'
    mockEnv.SENTRY_PROJECT = 'web'
    mockEnv.SENTRY_API_BASE_URL = 'https://sentry.example.com/'
    expect(monitoringConfig().issuesUrl).toBe(
      'https://sentry.example.com/organizations/acme/issues/?project=web'
    )
  })
})
