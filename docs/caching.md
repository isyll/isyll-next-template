# Caching

Two complementary tiers, both keyed by the **same tag vocabulary** so a single
write (or domain event) can invalidate everything derived from it.

| Tier                  | Caches                             | Lives in                   | Invalidate with       |
| --------------------- | ---------------------------------- | -------------------------- | --------------------- |
| **Render cache**      | rendered Server Component output   | Next.js (Cache Components) | `revalidateTag(...)`  |
| **Shared data cache** | serialized values across instances | Redis (`@/lib/cache`)      | `invalidateTags(...)` |

Both degrade safely: render caching is a Next built-in, and the Redis tier
no-ops without `REDIS_URL` (every read becomes the underlying query).

## Shared data cache — `@/lib/cache`

A typed, Redis-backed cache for data that is expensive to compute and safe to
serve slightly stale — a subscription state, an aggregate count, a third-party
lookup. Built on the shared ioredis client (`@/lib/redis`), so it inherits the
same `REDIS_URL` gating and graceful degradation.

```ts
import { cached, cacheKeys, cacheTags } from '@/lib/cache'

// Read-through: cache hit, or run the loader, store it (TTL + tags), return it.
const subscription = await cached(
  cacheKeys.activeSubscription(userId),
  () => loadSubscriptionFromDb(userId),
  { tags: [cacheTags.userBilling(userId)] }
)
```

API:

- `cached(key, loader, opts?)` — read-through. Without Redis it is just
  `loader()`. Caches `null`/`false`/`0` correctly (an envelope distinguishes a
  cached `null` from a miss), so unknown keys don't re-query every time.
- `cacheGet<T>(key)` / `cacheSet(key, value, opts?)` / `cacheDelete(...keys)` —
  explicit access when read-through doesn't fit.
- `invalidateTags(...tags)` — drop every entry carrying any of the tags.
- `cacheTags` / `cacheKeys` — the shared builders. **Add one per cacheable
  concern** and use it on both sides of the cache (write + invalidate).

`opts`: `ttlSeconds` (default 300; `0` = no expiry) and `tags`. Invalidation is
meant to be precise; the TTL is only a backstop.

### Invalidated by domain events

The point of the Redis tier is **cross-instance** freshness: when data changes,
every instance should see it immediately rather than waiting out the TTL. Wire
the invalidation to the domain event that represents the change.

The built-in example is billing. `getActiveSubscription(userId)` is cached and
tagged `cacheTags.userBilling(userId)`. When Stripe sends a subscription event,
it is routed through the outbox and the `billing.webhook` handler updates the
mirror row and then drops the tag:

```ts
// apps/web/server/events/handlers.ts — onBillingWebhook
await upsertSubscription({
  /* … */
})
await invalidateTags(cacheTags.userBilling(userId))
```

Because the handler runs in the **outbox worker** (a separate process), it can
only reach the shared Redis tier — which is exactly what cross-process
invalidation needs. Render-cache tags (below) are revalidated in-process.

## Render cache — Next 16 Cache Components

Cache Components (`use cache` + `cacheTag`/`revalidateTag`) cache rendered output
and `fetch`/function results. It is **opt-in**: uncomment `cacheComponents: true`
in [`next.config.ts`](../apps/web/next.config.ts), then wrap every dynamic read
(`cookies()`, `headers()`, `searchParams`) in `<Suspense>` — without that the
build fails. Adopt it page-by-page.

Use the **same** `cacheTags` builders so one invalidation covers both tiers:

```ts
import { unstable_cacheTag as cacheTag } from 'next/cache'
import { cacheTags } from '@/lib/cache'

async function BillingSummary({ userId }: { userId: string }) {
  'use cache'
  cacheTag(cacheTags.userBilling(userId))
  const sub = await getActiveSubscription(userId)
  return <Summary subscription={sub} />
}
```

Revalidate the render tag **synchronously, in-process** — from the Server Action
or Route Handler that made the change (where the Next cache context exists):

```ts
import { revalidateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache'

revalidateTag(cacheTags.userBilling(userId))
```

`revalidateTag` only affects the Next server that runs it, so call it where the
mutation happens. For mutations that fan out through the outbox worker, rely on
the Redis tier for cross-process invalidation and short render-cache TTLs (or a
`revalidateTag` in the originating action) for the render tier.

## When to cache what

- **Per-render, request-scoped reuse** (the same flag read many times in one
  render): a tiny in-process memo, like `@/lib/feature-flags/cache` does — no
  Redis round-trip.
- **Cross-request / cross-instance** shared data: `@/lib/cache`.
- **Whole rendered fragments**: Cache Components.

Don't cache anything you can't safely serve stale for the TTL window, and never
cache per-user data under a shared key — always include the user id in the key
and tag (`cacheKeys.*`/`cacheTags.*` make this the default).
