import 'server-only'

import { RateLimitError } from '@workspace/core'

import { getRedis } from '@/lib/redis'
import { captureSecurityEvent } from '@/lib/sentry'

/**
 * Application-level rate limiting for Server Actions and route handlers. This
 * is separate from (and complementary to) BetterAuth's own auth-endpoint rate
 * limiter.
 *
 * Concrete implementation: sliding-window counter backed by ioredis. When
 * `REDIS_URL` is set, limits are distributed and survive restarts. Without
 * Redis it falls back to an in-process fixed-window limiter — correct for local
 * dev and single-instance deploys, but NOT shared across instances. Always
 * configure `REDIS_URL` in production.
 */
export interface RateLimitResult {
  readonly success: boolean
  readonly limit: number
  readonly remaining: number
  /** Unix-ms timestamp when the window resets. */
  readonly reset: number
}

export interface RateLimiter {
  limit: (identifier: string) => Promise<RateLimitResult>
}

export interface RateLimitConfig {
  /** Allowed requests per window. */
  tokens: number
  /** Window length in seconds. */
  windowSeconds: number
  /** Namespacing prefix so independent limiters don't collide. */
  prefix?: string
}

// ─── In-process fallback ─────────────────────────────────────────────────────

/** Fixed-window in-process limiter (fallback when Redis isn't configured). */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly tokens: number,
    private readonly windowMs: number
  ) {}

  limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const entry = this.hits.get(identifier)

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.windowMs
      this.hits.set(identifier, { count: 1, resetAt })
      return Promise.resolve({
        success: true,
        limit: this.tokens,
        remaining: this.tokens - 1,
        reset: resetAt,
      })
    }

    entry.count += 1
    return Promise.resolve({
      success: entry.count <= this.tokens,
      limit: this.tokens,
      remaining: Math.max(0, this.tokens - entry.count),
      reset: entry.resetAt,
    })
  }
}

// ─── Redis sliding-window limiter ────────────────────────────────────────────

/**
 * Sliding-window rate limiter backed by ioredis.
 *
 * Algorithm: sorted-set per identifier; each request is a member with a score
 * equal to its timestamp. Old entries outside the window are pruned atomically
 * (ZREMRANGEBYSCORE + ZADD + EXPIRE in a pipeline). O(log N) per call.
 */
class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly tokens: number,
    private readonly windowMs: number,
    private readonly prefix: string
  ) {}

  async limit(identifier: string): Promise<RateLimitResult> {
    const redis = getRedis()
    if (!redis) {
      // Should not happen — only created when Redis is available.
      return {
        success: true,
        limit: this.tokens,
        remaining: this.tokens - 1,
        reset: Date.now() + this.windowMs,
      }
    }

    const key = `${this.prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - this.windowMs
    const resetAt = now + this.windowMs

    const pipeline = redis.pipeline()
    // Remove entries older than the window.
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    // Add current request.
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    // Count entries in the window.
    pipeline.zcard(key)
    // Set TTL so the key expires automatically.
    pipeline.pexpire(key, this.windowMs)

    const results = await pipeline.exec()
    // zcard result is at index 2 of the pipeline.
    const rawCount = results?.[2]?.[1]
    const count = typeof rawCount === 'number' ? rawCount : 1
    const remaining = Math.max(0, this.tokens - count)

    return {
      success: count <= this.tokens,
      limit: this.tokens,
      remaining,
      reset: resetAt,
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Build a rate limiter, backed by Redis when configured, else in-process. */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const redis = getRedis()
  const prefix = config.prefix ?? 'ratelimit'
  if (redis) {
    return new RedisRateLimiter(
      config.tokens,
      config.windowSeconds * 1000,
      prefix
    )
  }
  return new InMemoryRateLimiter(config.tokens, config.windowSeconds * 1000)
}

/**
 * Consume one token for `identifier`, throwing an operational `RateLimitError`
 * (HTTP 429, safe to surface) when the limit is exceeded.
 */
export async function enforceRateLimit(
  limiter: RateLimiter,
  identifier: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier)
  if (!result.success) {
    // Surface the abuse signal to Sentry (no-op when disabled) — a spike here
    // often precedes credential-stuffing or scraping.
    captureSecurityEvent('Rate limit exceeded', {
      extra: { identifier, limit: result.limit, reset: result.reset },
    })
    throw new RateLimitError('Too many requests — please slow down.')
  }
  return result
}
