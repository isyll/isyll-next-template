import 'server-only'

import Redis, { type RedisOptions } from 'ioredis'

import { env } from '@/env'
/**
 * Typed Redis client (ioredis). Provides:
 *  - A lazily created singleton client (`getRedis()`)
 *  - A typed secondary-storage adapter for BetterAuth session caching
 *  - Helper utilities for common patterns (typed get/set, JSON, TTL helpers)
 *
 * The client degrades gracefully: when `REDIS_URL` is absent (local dev without
 * Redis) every operation is a no-op or returns `null`. Configure `REDIS_URL` in
 * production (`redis://:password@host:6379`).
 *
 * Connection is lazy — importing this module does not require `REDIS_URL`.
 */

// ─── Singleton client ────────────────────────────────────────────────────────

const globalForRedis = globalThis as typeof globalThis & {
  __redisClient?: Redis
}

function createRedisOptions(_url: string): RedisOptions {
  return {
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null // Stop retrying after 5 attempts
      return Math.min(times * 200, 2000)
    },
    reconnectOnError(err) {
      // Reconnect on READONLY and ECONNRESET errors.
      return (
        err.message.includes('READONLY') || err.message.includes('ECONNRESET')
      )
    },
    // Connection pool — use a single connection for the web process.
    // Separate clients can be created for pubsub/blocking commands.
    connectionName: 'web',
  }
}

/** Returns the global Redis client, creating it once. Returns `null` in dev
 *  when `REDIS_URL` is not configured. Never throws on creation. */
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null

  if (env.NODE_ENV !== 'production' && globalForRedis.__redisClient) {
    return globalForRedis.__redisClient
  }

  const client = new Redis(env.REDIS_URL, createRedisOptions(env.REDIS_URL))

  client.on('error', (err: Error) => {
    // Don't crash the process on connection errors; just log them.
    console.error('[redis] connection error', err.message)
  })

  if (env.NODE_ENV !== 'production') {
    globalForRedis.__redisClient = client
  }

  return client
}

// ─── Typed helpers ───────────────────────────────────────────────────────────

/**
 * Get a JSON-decoded value from Redis, or `null` if absent / Redis is
 * unconfigured.
 */
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

/**
 * Set a JSON-encoded value in Redis with an optional TTL (seconds). No-op when
 * Redis is unconfigured.
 */
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

/**
 * Delete one or more keys from Redis. No-op when Redis is unconfigured.
 */
export async function redisDel(...keys: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis || keys.length === 0) return
  await redis.del(...keys)
}

/**
 * Increment a counter in Redis with an optional TTL (set only on first call).
 * Returns the new value, or 0 when Redis is unconfigured.
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

// ─── BetterAuth secondary-storage adapter ───────────────────────────────────

/**
 * Creates a BetterAuth `secondaryStorage` adapter backed by ioredis. When
 * `REDIS_URL` is set, sessions are stored exclusively in Redis (fast lookup,
 * TTL-based expiry). When not set, returns a no-op adapter — BetterAuth falls
 * back to its PostgreSQL adapter gracefully.
 *
 * Usage:
 *   import { createRedisSecondaryStorage } from '@/lib/redis'
 *   betterAuth({ secondaryStorage: createRedisSecondaryStorage(), ... })
 */
export interface SecondaryStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}

export function createRedisSecondaryStorage(): SecondaryStorage {
  const redis = getRedis()

  if (!redis) {
    // No-op adapter — BetterAuth uses its primary DB adapter for sessions.
    return {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    }
  }

  return {
    async get(key) {
      return redis.get(key)
    },
    async set(key, value, ttl) {
      if (ttl && ttl > 0) {
        await redis.setex(key, ttl, value)
      } else {
        await redis.set(key, value)
      }
    },
    async delete(key) {
      await redis.del(key)
    },
  }
}

export type { Redis }
