import 'server-only'

import Redis, { type RedisOptions } from 'ioredis'

import { env } from '@/env'

/**
 * Typed Redis client (ioredis) for the web app. Provides a lazily created
 * singleton (`getRedis()`) plus small JSON/TTL helpers used by app code (e.g.
 * rate limiting in `@/lib/rate-limit`).
 *
 * BetterAuth session storage uses its own client/adapter in `@workspace/auth`
 * (a package can't import the app); both share the same `REDIS_URL` and
 * connection strategy.
 *
 * Degrades gracefully: when `REDIS_URL` is absent (local dev without Redis)
 * every operation is a no-op or returns `null`. Configure `REDIS_URL` in
 * production (`redis://:password@host:6379`, or `rediss://…` for TLS — ioredis
 * enables TLS automatically from the `rediss` scheme). Connection is lazy:
 * importing this module never requires `REDIS_URL`.
 */

// Singleton client

const globalForRedis = globalThis as typeof globalThis & {
  __redisClient?: Redis
}

/** Shared connection options. Mirrors `@workspace/auth`'s client. */
function createRedisOptions(): RedisOptions {
  return {
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    // Stop retrying after 5 attempts; back off 200ms→2s in between.
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
    reconnectOnError: (err) =>
      err.message.includes('READONLY') || err.message.includes('ECONNRESET'),
    connectionName: 'web',
  }
}

/**
 * Returns the global Redis client, creating it once. Returns `null` in dev when
 * `REDIS_URL` is not configured. Never throws on creation.
 */
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null

  if (env.NODE_ENV !== 'production' && globalForRedis.__redisClient) {
    return globalForRedis.__redisClient
  }

  const client = new Redis(env.REDIS_URL, createRedisOptions())
  client.on('error', (err: Error) => {
    // Don't crash the process on connection errors; just log them.
    console.error('[redis] connection error', err.message)
  })

  if (env.NODE_ENV !== 'production') {
    globalForRedis.__redisClient = client
  }

  return client
}

// Typed helpers

/** Get a JSON-decoded value, or `null` if absent / Redis is unconfigured. */
export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Set a JSON-encoded value with an optional TTL (seconds). No-op without Redis. */
export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const serialized = JSON.stringify(value)
  if (ttlSeconds && ttlSeconds > 0) {
    await redis.setex(key, ttlSeconds, serialized)
  } else {
    await redis.set(key, serialized)
  }
}

/** Delete one or more keys. No-op when Redis is unconfigured. */
export async function redisDel(...keys: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis || keys.length === 0) return
  await redis.del(...keys)
}

/**
 * Increment a counter, setting an optional TTL on first increment. Returns the
 * new value, or 0 when Redis is unconfigured.
 */
export async function redisIncr(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  const redis = getRedis()
  if (!redis) return 0
  const value = await redis.incr(key)
  if (value === 1 && ttlSeconds) {
    await redis.expire(key, ttlSeconds)
  }
  return value
}

export type { Redis }
