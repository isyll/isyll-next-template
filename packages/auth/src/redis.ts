import Redis from 'ioredis'

/**
 * BetterAuth `secondaryStorage` adapter backed by ioredis.
 *
 * When `REDIS_URL` is set, sessions are stored exclusively in Redis (fast
 * lookup, TTL-based expiry). Set `session.storeSessionInDatabase: false` (the
 * default when `secondaryStorage` is provided) so sessions never touch
 * PostgreSQL. When `REDIS_URL` is absent, every operation is a no-op and
 * BetterAuth falls back to its primary database adapter.
 *
 * Mirrors the connection strategy of the web app's client (`apps/web/lib/redis`)
 * — a package can't import the app, so the small client is duplicated. Use
 * `rediss://` for TLS (ioredis enables it from the scheme). Call
 * `createAuthRedisStorage()` once per BetterAuth instance; the key-space prefix
 * isolates user sessions from operator sessions.
 */
export interface AuthSecondaryStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}

const globalForAuthRedis = globalThis as typeof globalThis & {
  __authRedisClient?: Redis
}

function getAuthRedis(): Redis | null {
  const url = process.env['REDIS_URL']
  if (!url) return null

  if (
    process.env['NODE_ENV'] !== 'production' &&
    globalForAuthRedis.__authRedisClient
  ) {
    return globalForAuthRedis.__authRedisClient
  }

  const client = new Redis(url, {
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectionName: 'auth',
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
    reconnectOnError: (err) =>
      err.message.includes('READONLY') || err.message.includes('ECONNRESET'),
  })

  client.on('error', (err: Error) => {
    console.error('[auth:redis] connection error', err.message)
  })

  if (process.env['NODE_ENV'] !== 'production') {
    globalForAuthRedis.__authRedisClient = client
  }

  return client
}

/**
 * Returns a BetterAuth-compatible `secondaryStorage` adapter. Pass this as
 * `secondaryStorage` in your `betterAuth()` config. The `prefix` separates
 * user sessions (`'user'`) from operator sessions (`'admin'`) in the same
 * Redis instance.
 */
export function createAuthRedisStorage(
  prefix: 'user' | 'admin'
): AuthSecondaryStorage {
  const redis = getAuthRedis()

  if (!redis) {
    // No Redis configured — BetterAuth will use its primary DB adapter.
    return {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    }
  }

  const ns = (key: string) => `auth:${prefix}:${key}`

  return {
    async get(key) {
      return redis.get(ns(key))
    },
    async set(key, value, ttl) {
      if (ttl && ttl > 0) {
        await redis.setex(ns(key), ttl, value)
      } else {
        await redis.set(ns(key), value)
      }
    },
    async delete(key) {
      await redis.del(ns(key))
    },
  }
}

/**
 * Force-logout: revoke every session of an account by clearing it from Redis.
 * BetterAuth keeps a per-account index (`active-sessions-<id>` → a list of
 * `{ token }`) in secondary storage, with each session stored under its token;
 * we delete both, namespaced by the same `prefix` as the storage adapter. No-op
 * (returns 0) when Redis is unconfigured — dev (DB sessions) should also clear
 * the relevant sessions rows. Returns the number of sessions revoked.
 */
async function revokeSessions(
  prefix: 'user' | 'admin',
  accountId: string
): Promise<number> {
  const redis = getAuthRedis()
  if (!redis) return 0

  const ns = (key: string) => `auth:${prefix}:${key}`
  const indexKey = ns(`active-sessions-${accountId}`)
  const raw = await redis.get(indexKey)
  if (!raw) return 0

  let sessions: { token: string }[]
  try {
    sessions = JSON.parse(raw) as { token: string }[]
  } catch {
    sessions = []
  }

  const sessionKeys = sessions.map((session) => ns(session.token))
  if (sessionKeys.length > 0) await redis.del(...sessionKeys)
  await redis.del(indexKey)
  return sessions.length
}

/** Revoke all sessions of an end user (force-logout). */
export function revokeUserSessions(userId: string): Promise<number> {
  return revokeSessions('user', userId)
}

/** Revoke all sessions of an operator (e.g. when deactivating them). */
export function revokeOperatorSessions(operatorId: string): Promise<number> {
  return revokeSessions('admin', operatorId)
}
