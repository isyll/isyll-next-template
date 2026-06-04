import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { RateLimitError } from '@workspace/core'

import { env } from '@/env'

/**
 * Application-level rate limiting for Server Actions and route handlers. This is
 * separate from (and complementary to) BetterAuth's own auth-endpoint limiter.
 *
 * Concrete vendor: Upstash (HTTP Redis — works on every runtime incl. edge).
 * When `UPSTASH_REDIS_REST_URL` + `_TOKEN` are set, limits are distributed and
 * survive restarts. Otherwise it falls back to an in-process limiter — correct
 * for local dev and single-instance deploys, but NOT shared across instances,
 * so configure Upstash in production.
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

/** Fixed-window in-process limiter (fallback when Upstash isn't configured). */
class InMemoryRateLimiter implements RateLimiter {
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

function createUpstashLimiter(
  url: string,
  token: string,
  config: RateLimitConfig
): RateLimiter {
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(
      config.tokens,
      `${config.windowSeconds} s`
    ),
    prefix: config.prefix ?? 'ratelimit',
    analytics: false,
  })
  return {
    async limit(identifier) {
      const { success, limit, remaining, reset } =
        await ratelimit.limit(identifier)
      return { success, limit, remaining, reset }
    },
  }
}

/** Build a rate limiter, backed by Upstash when configured, else in-process. */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    return createUpstashLimiter(url, token, config)
  }
  return new InMemoryRateLimiter(config.tokens, config.windowSeconds * 1000)
}

/**
 * Consume one token for `identifier`, throwing an operational `RateLimitError`
 * (HTTP 429, safe to surface) when the limit is exceeded. Use inside Server
 * Actions / route handlers.
 */
export async function enforceRateLimit(
  limiter: RateLimiter,
  identifier: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier)
  if (!result.success) {
    throw new RateLimitError('Too many requests — please slow down.')
  }
  return result
}

export { InMemoryRateLimiter }
