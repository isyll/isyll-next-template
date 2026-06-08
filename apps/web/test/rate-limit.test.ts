import { RateLimitError } from '@workspace/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate from Sentry (it reads server env, unavailable under jsdom).
vi.mock('@/lib/sentry', () => ({ captureSecurityEvent: vi.fn() }))

import { InMemoryRateLimiter, enforceRateLimit } from '@/lib/rate-limit'

describe('InMemoryRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to `tokens` requests then blocks within the window', async () => {
    const limiter = new InMemoryRateLimiter(2, 1000)
    expect((await limiter.limit('a')).success).toBe(true)
    expect((await limiter.limit('a')).success).toBe(true)
    const third = await limiter.limit('a')
    expect(third.success).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it('tracks identifiers independently', async () => {
    const limiter = new InMemoryRateLimiter(1, 1000)
    expect((await limiter.limit('a')).success).toBe(true)
    expect((await limiter.limit('b')).success).toBe(true)
    expect((await limiter.limit('a')).success).toBe(false)
  })

  it('resets after the window elapses', async () => {
    const limiter = new InMemoryRateLimiter(1, 1000)
    expect((await limiter.limit('a')).success).toBe(true)
    expect((await limiter.limit('a')).success).toBe(false)
    vi.advanceTimersByTime(1001)
    expect((await limiter.limit('a')).success).toBe(true)
  })
})

describe('enforceRateLimit', () => {
  it('resolves while under the limit', async () => {
    const limiter = new InMemoryRateLimiter(1, 1000)
    await expect(enforceRateLimit(limiter, 'a')).resolves.toMatchObject({
      success: true,
    })
  })

  it('throws a RateLimitError once exceeded', async () => {
    const limiter = new InMemoryRateLimiter(1, 1000)
    await enforceRateLimit(limiter, 'a')
    await expect(enforceRateLimit(limiter, 'a')).rejects.toBeInstanceOf(
      RateLimitError
    )
  })
})
