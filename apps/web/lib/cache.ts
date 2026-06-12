import 'server-only'

import { getRedis } from '@/lib/redis'

/**
 * Typed, Redis-backed cache for shared, cross-request / cross-instance data —
 * the second tier of the project's caching story (the first being Next 16 Cache
 * Components for render output; see `docs/caching.md`).
 *
 * Use it for data that is expensive to compute and safe to serve slightly stale:
 * a user's subscription state, aggregate counts, third-party lookups, … Reach
 * for {@link cached} (read-through) at a call site, then invalidate precisely on
 * the matching domain event so other instances converge immediately rather than
 * waiting out the TTL.
 *
 * Built on the shared ioredis client (`@/lib/redis`), so it degrades gracefully:
 * without `REDIS_URL` (local dev) {@link cached} always runs the loader, reads
 * return `null`, and writes/invalidations are no-ops — correct, just uncached.
 *
 * Keys are namespaced under `cache:`; tags under `cache:tag:`. A tag is a Redis
 * set of the entry keys that carry it, so {@link invalidateTags} can drop a whole
 * group (e.g. everything derived from one user) in one call.
 */

const KEY_PREFIX = 'cache:'
const TAG_PREFIX = 'cache:tag:'

/** Default entry lifetime. Invalidation is precise; the TTL is a safety net. */
const DEFAULT_TTL_SECONDS = 300

/**
 * Tag sets outlive their entries so a tag can always reach its members to drop
 * them; orphaned members are harmless (a `DEL` of an absent key is a no-op).
 */
const TAG_TTL_SECONDS = 24 * 60 * 60

export interface CacheOptions {
  /** Time-to-live in seconds. Defaults to 5 minutes; pass `0` for no expiry. */
  ttlSeconds?: number
  /** Tags this entry joins; `invalidateTags(tag)` drops every entry carrying it. */
  tags?: readonly string[]
}

/**
 * Envelope so a cached `null`/`false`/`0` is distinguishable from a cache miss
 * (a bare stored `null` is ambiguous). {@link cached} reads and writes envelopes.
 */
interface Envelope<T> {
  readonly v: T
}

function entryKey(key: string): string {
  return `${KEY_PREFIX}${key}`
}

function tagKey(tag: string): string {
  return `${TAG_PREFIX}${tag}`
}

/** Read a JSON-decoded value, or `null` when absent / Redis is unconfigured. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get(entryKey(key))
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Write a JSON-encoded value with an optional TTL and tags. Entry write and tag
 * membership go in one pipeline. No-op without Redis.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  options?: CacheOptions
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const fullKey = entryKey(key)
  const serialized = JSON.stringify(value)

  const pipeline = redis.pipeline()
  if (ttl > 0) pipeline.set(fullKey, serialized, 'EX', ttl)
  else pipeline.set(fullKey, serialized)
  for (const tag of options?.tags ?? []) {
    const tk = tagKey(tag)
    pipeline.sadd(tk, fullKey)
    pipeline.expire(tk, TAG_TTL_SECONDS)
  }
  await pipeline.exec()
}

/** Delete one or more cache entries by key. No-op without Redis. */
export async function cacheDelete(...keys: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis || keys.length === 0) return
  await redis.del(...keys.map(entryKey))
}

/**
 * Read-through cache: return the cached value for `key`, or run `loader`, store
 * the result (including `null`), and return it. Without Redis this is just
 * `loader()`. Concurrent misses may each run the loader once — acceptable for
 * idempotent reads; add a lock if a loader is expensive enough to need one.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const hit = await cacheGet<Envelope<T>>(key)
  if (hit) return hit.v

  const value = await loader()
  const envelope: Envelope<T> = { v: value }
  await cacheSet(key, envelope, options)
  return value
}

/**
 * Drop every cache entry carrying any of the given tags, then the tag sets
 * themselves. No-op without Redis. Call this from the domain-event handler (or
 * Server Action) that makes the underlying data stale.
 */
export async function invalidateTags(...tags: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis || tags.length === 0) return
  for (const tag of tags) {
    const tk = tagKey(tag)
    const members = await redis.smembers(tk)
    if (members.length > 0) await redis.del(...members)
    await redis.del(tk)
  }
}

/**
 * Shared tag vocabulary. Use the SAME builders for the Redis cache here and for
 * Next render caching (`cacheTag(...)` / `revalidateTag(...)`) so one event can
 * invalidate both tiers. Add a builder per cacheable concern.
 */
export const cacheTags = {
  /** Everything derived from one user's billing/subscription state. */
  userBilling: (userId: string) => `user:${userId}:billing`,
} as const

/** Shared key builders, kept alongside the tags so call sites stay consistent. */
export const cacheKeys = {
  /** The user's active-subscription read (`@/features/billing/queries`). */
  activeSubscription: (userId: string) => `billing:subscription:${userId}`,
} as const
