import 'server-only'

import type { FlagDefinition } from '@workspace/core'

import { redisDel, redisGet, redisSet } from '@/lib/redis'

/**
 * Two-tier cache for resolved flag definitions, sitting in front of the DB.
 *
 *   1. A per-instance in-process map with a very short TTL — absorbs the bursts
 *      of reads within a single request/render almost for free.
 *   2. A shared Redis layer with a longer TTL — keeps reads off Postgres across
 *      instances and survives restarts. No-ops without `REDIS_URL` (dev), in
 *      which case only the in-process tier is active.
 *
 * Both tiers cache misses too (a `null` definition), so unknown keys don't hit
 * the DB on every read. On a config change the writer calls
 * {@link invalidateFlagCache}; other instances converge within the TTLs below.
 */
const IN_PROCESS_TTL_MS = 5_000
const REDIS_TTL_SECONDS = 30
const REDIS_PREFIX = 'flags:def:'

interface CacheEntry {
  readonly definition: FlagDefinition | null
}

interface InProcessEntry {
  readonly entry: CacheEntry
  readonly expiresAt: number
}

const inProcess = new Map<string, InProcessEntry>()

function redisKey(key: string): string {
  return `${REDIS_PREFIX}${key}`
}

/**
 * Return the cached definition for `key`, loading and caching it on a miss.
 * `load` is expected to hit the database.
 */
export async function getCachedFlag(
  key: string,
  load: () => Promise<FlagDefinition | null>
): Promise<FlagDefinition | null> {
  const now = Date.now()

  const local = inProcess.get(key)
  if (local && local.expiresAt > now) return local.entry.definition

  const cached = await redisGet<CacheEntry>(redisKey(key))
  if (cached) {
    inProcess.set(key, { entry: cached, expiresAt: now + IN_PROCESS_TTL_MS })
    return cached.definition
  }

  const definition = await load()
  const entry: CacheEntry = { definition }
  inProcess.set(key, { entry, expiresAt: now + IN_PROCESS_TTL_MS })
  await redisSet(redisKey(key), entry, REDIS_TTL_SECONDS)
  return definition
}

/** Drop a single flag from both cache tiers (call after writing it). */
export async function invalidateFlagCache(key: string): Promise<void> {
  inProcess.delete(key)
  await redisDel(redisKey(key))
}

/** Clear the in-process tier (used by tests; Redis entries expire on their TTL). */
export function clearInProcessFlagCache(): void {
  inProcess.clear()
}
