import type { FlagDefinition } from '@workspace/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { catalogDefinition, FLAGS } from '@/lib/feature-flags/catalog'
import { FeatureFlagClient } from '@/lib/feature-flags/client'
import { StaticFlagProvider } from '@/lib/feature-flags/provider'

// Cache talks to Redis; stub it so the two-tier logic is exercised in isolation.
vi.mock('@/lib/redis', () => ({
  redisGet: vi.fn(() => Promise.resolve(null)),
  redisSet: vi.fn(() => Promise.resolve()),
  redisDel: vi.fn(() => Promise.resolve()),
}))

function clientWith(...definitions: FlagDefinition[]): FeatureFlagClient {
  return new FeatureFlagClient(new StaticFlagProvider(definitions))
}

describe('FeatureFlagClient', () => {
  it('falls back to the catalogue default when no flag is configured (STATIC)', async () => {
    const client = clientWith()
    expect(await client.getBoolean('ui.newDashboard')).toBe(false)
    const details = await client.getDetails('ui.newDashboard')
    expect(details).toMatchObject({ value: false, reason: 'STATIC' })
  })

  it('evaluates a configured boolean flag', async () => {
    const client = clientWith({
      key: 'ui.newDashboard',
      type: 'boolean',
      enabled: true,
      variants: { enabled: true, disabled: false },
      defaultVariant: 'enabled',
      offVariant: 'disabled',
      rules: [],
    })
    expect(await client.getBoolean('ui.newDashboard')).toBe(true)
  })

  it('honours targeting rules and reports the reason/variant', async () => {
    const client = clientWith({
      key: 'ui.newDashboard',
      type: 'boolean',
      enabled: true,
      variants: { enabled: true, disabled: false },
      defaultVariant: 'disabled',
      offVariant: 'disabled',
      rules: [
        {
          conditions: [
            { attribute: 'plan', operator: 'equals', values: ['pro'] },
          ],
          outcome: { kind: 'variant', variant: 'enabled' },
        },
      ],
    })
    expect(
      await client.getBoolean('ui.newDashboard', {
        attributes: { plan: 'free' },
      })
    ).toBe(false)
    const pro = await client.getDetails('ui.newDashboard', {
      attributes: { plan: 'pro' },
    })
    expect(pro).toMatchObject({
      value: true,
      reason: 'TARGETING_MATCH',
      variant: 'enabled',
    })
  })

  it('resolves number flags and their defaults', async () => {
    const configured = clientWith({
      key: 'uploads.maxMegabytes',
      type: 'number',
      enabled: true,
      variants: { default: 25 },
      defaultVariant: 'default',
      offVariant: 'default',
      rules: [],
    })
    expect(await configured.getNumber('uploads.maxMegabytes')).toBe(25)
    expect(await clientWith().getNumber('uploads.maxMegabytes')).toBe(
      FLAGS['uploads.maxMegabytes'].defaultValue
    )
  })

  it('returns the catalogue default on a type mismatch (TYPE_MISMATCH)', async () => {
    const client = clientWith({
      key: 'ui.newDashboard',
      type: 'string',
      enabled: true,
      variants: { broken: 'not-a-boolean' },
      defaultVariant: 'broken',
      offVariant: 'broken',
      rules: [],
    })
    const details = await client.getDetails('ui.newDashboard')
    expect(details.value).toBe(false)
    expect(details.reason).toBe('ERROR')
    expect(details.errorCode).toBe('TYPE_MISMATCH')
  })

  it('never throws — a failing provider yields the default with a GENERAL error', async () => {
    const provider = {
      name: 'broken',
      resolve: () => Promise.reject(new Error('backend down')),
    }
    const client = new FeatureFlagClient(provider)
    const details = await client.getDetails('billing.enabled')
    expect(details).toMatchObject({
      value: false,
      reason: 'ERROR',
      errorCode: 'GENERAL',
    })
  })
})

describe('catalogDefinition', () => {
  it('materializes a boolean flag with two variants reflecting the default', () => {
    const def = catalogDefinition('ui.newDashboard') // default false
    expect(def).toMatchObject({
      type: 'boolean',
      enabled: true,
      variants: { enabled: true, disabled: false },
      defaultVariant: 'disabled',
      offVariant: 'disabled',
    })
  })

  it('materializes a number flag with a single default variant', () => {
    const def = catalogDefinition('uploads.maxMegabytes')
    expect(def).toMatchObject({
      type: 'number',
      variants: { default: 10 },
      defaultVariant: 'default',
    })
  })
})

describe('flag cache (two-tier)', () => {
  it('loads once, then serves from the in-process tier until invalidated', async () => {
    const { clearInProcessFlagCache, getCachedFlag, invalidateFlagCache } =
      await import('@/lib/feature-flags/cache')
    clearInProcessFlagCache()

    const load = vi.fn(() => Promise.resolve(null))
    await getCachedFlag('demo', load)
    await getCachedFlag('demo', load)
    expect(load).toHaveBeenCalledTimes(1) // second read hit the cache

    await invalidateFlagCache('demo')
    await getCachedFlag('demo', load)
    expect(load).toHaveBeenCalledTimes(2) // reloaded after invalidation
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})
