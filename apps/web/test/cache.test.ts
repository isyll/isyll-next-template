import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Minimal in-memory ioredis fake covering the subset `@/lib/cache` uses. The
 * pipeline applies its queued ops on `exec()`, mirroring ioredis semantics
 * closely enough to exercise the tag bookkeeping.
 */
class FakeRedis {
  readonly strings = new Map<string, string>()
  readonly sets = new Map<string, Set<string>>()

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.strings.get(key) ?? null)
  }

  del(...keys: string[]): Promise<number> {
    let removed = 0
    for (const key of keys) {
      if (this.strings.delete(key)) removed += 1
      if (this.sets.delete(key)) removed += 1
    }
    return Promise.resolve(removed)
  }

  smembers(key: string): Promise<string[]> {
    return Promise.resolve([...(this.sets.get(key) ?? [])])
  }

  pipeline(): {
    set: (key: string, value: string) => unknown
    sadd: (key: string, member: string) => unknown
    expire: () => unknown
    exec: () => Promise<unknown[]>
  } {
    const ops: (() => void)[] = []
    const chain = {
      set: (key: string, value: string) => {
        ops.push(() => this.strings.set(key, value))
        return chain
      },
      sadd: (key: string, member: string) => {
        ops.push(() => {
          const set = this.sets.get(key) ?? new Set<string>()
          set.add(member)
          this.sets.set(key, set)
        })
        return chain
      },
      expire: () => chain,
      exec: () => {
        for (const op of ops) op()
        return Promise.resolve([])
      },
    }
    return chain
  }
}

const mocks = vi.hoisted(() => ({ redis: null as FakeRedis | null }))

vi.mock('@/lib/redis', () => ({ getRedis: () => mocks.redis }))

const { cached, cacheDelete, cacheGet, cacheSet, cacheTags, invalidateTags } =
  await import('@/lib/cache')

describe('@/lib/cache', () => {
  beforeEach(() => {
    mocks.redis = new FakeRedis()
  })

  describe('without Redis configured', () => {
    beforeEach(() => {
      mocks.redis = null
    })

    it('runs the loader on every call and never caches', async () => {
      const loader = vi.fn(() => Promise.resolve(42))
      expect(await cached('k', loader)).toBe(42)
      expect(await cached('k', loader)).toBe(42)
      expect(loader).toHaveBeenCalledTimes(2)
    })

    it('reads return null and writes are no-ops', async () => {
      await cacheSet('k', 'v')
      expect(await cacheGet('k')).toBeNull()
    })
  })

  it('serves a cached value without re-running the loader', async () => {
    const loader = vi.fn(() => Promise.resolve({ name: 'ada' }))
    expect(await cached('user:1', loader)).toEqual({ name: 'ada' })
    expect(await cached('user:1', loader)).toEqual({ name: 'ada' })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('caches a null result, distinguishing it from a miss', async () => {
    const loader = vi.fn(() => Promise.resolve(null))
    expect(await cached('absent', loader)).toBeNull()
    expect(await cached('absent', loader)).toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('round-trips an explicit get/set', async () => {
    await cacheSet('greeting', 'bonjour')
    expect(await cacheGet<string>('greeting')).toBe('bonjour')
    expect(await cacheGet('missing')).toBeNull()
  })

  it('invalidateTags drops every entry carrying the tag', async () => {
    const tag = cacheTags.userBilling('u1')
    await cacheSet(
      'billing:subscription:u1',
      { status: 'active' },
      { tags: [tag] }
    )
    await cacheSet('billing:invoices:u1', [1, 2], { tags: [tag] })

    await invalidateTags(tag)

    expect(await cacheGet('billing:subscription:u1')).toBeNull()
    expect(await cacheGet('billing:invoices:u1')).toBeNull()
  })

  it('cacheDelete removes a single entry by key', async () => {
    await cacheSet('a', 1)
    await cacheSet('b', 2)
    await cacheDelete('a')
    expect(await cacheGet('a')).toBeNull()
    expect(await cacheGet<number>('b')).toBe(2)
  })
})
