# Feature flags

A small, **DB-backed, Redis-cached** feature-flag service that gates features per
user (or any context attribute), with **percentage rollouts** and rich targeting
rules. The decision logic is a pure, well-tested engine in `@workspace/core`; the
backend sits behind an **OpenFeature-style provider** seam, so it is swappable
(Postgres today, an external service tomorrow) without touching call sites.

It is **degrade-safe and zero-config**: with no database row a flag resolves to
its catalogue default, and without `REDIS_URL` only the in-process cache is used.
No new environment variables.

## At a glance

```ts
import { isEnabled, getNumberFlag, FeatureGate } from '@/lib/feature-flags'

// In a Server Component / Server Action — evaluated for the current user:
if (await isEnabled('billing.enabled')) {
  /* … */
}
const maxMb = await getNumberFlag('uploads.maxMegabytes')

// As a server-rendered gate:
;<FeatureGate flag="ui.newDashboard" fallback={<LegacyDashboard />}>
  <NewDashboard />
</FeatureGate>
```

Keys, value types, and defaults are checked at compile time against the
catalogue, so `isEnabled('typo')` or `getNumberFlag('billing.enabled')` (wrong
type) are type errors. A flag check **never throws** — on any error it returns
the catalogue default (OpenFeature semantics).

## Architecture

| Layer                                          | Responsibility                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `@workspace/core` (`feature-flags.ts`)         | Pure `evaluateFlag(definition, context)` — variants, rules, rollouts, reasons.    |
| `app.feature_flags` table                      | Per-key runtime configuration (the DB-backed store).                              |
| `lib/feature-flags/cache.ts`                   | Two-tier cache: in-process (5 s) + Redis (30 s), with negative caching.           |
| `lib/feature-flags/provider.ts` + `database-…` | The swappable `FlagProvider` seam (`DatabaseFlagProvider`, `StaticFlagProvider`). |
| `lib/feature-flags/client.ts`                  | Typed client: default fallback + value coercion over a provider.                  |
| `lib/feature-flags/catalog.ts`                 | The compile-time flag catalogue (keys, types, defaults).                          |
| `lib/feature-flags/context.ts`                 | Builds the evaluation context from the session; ergonomic server helpers.         |

## Defining a flag

1. Add it to the catalogue in [`lib/feature-flags/catalog.ts`](../apps/web/lib/feature-flags/catalog.ts):

   ```ts
   export const FLAGS = {
     // …
     'ui.newDashboard': boolean(
       false,
       'Opt users into the redesigned dashboard.'
     ),
   } as const satisfies Record<string, FlagSpec>
   ```

   That is enough to use it: with no DB row it resolves to the default (`false`).

2. To tune it at runtime (enable, target, roll out) materialize a DB row and edit
   it:

   ```bash
   pnpm --filter web flags sync            # create rows for catalogue flags
   pnpm --filter web flags enable ui.newDashboard
   ```

## Targeting rules & rollouts

A stored flag has named **variants** (name → value), a **default variant**
(served when on with no matching rule), an **off variant** (the kill switch),
and an ordered list of **rules** (first match wins). The `rules` column is a
`TargetingRule[]`:

```jsonc
[
  // Always on for internal users…
  {
    "conditions": [
      {
        "attribute": "email",
        "operator": "endsWith",
        "values": ["@acme.test"],
      },
    ],
    "outcome": { "kind": "variant", "variant": "enabled" },
  },
  // …and a 20% rollout for everyone else, sticky by the targeting key.
  {
    "conditions": [],
    "outcome": {
      "kind": "rollout",
      "weights": { "enabled": 20, "disabled": 80 },
    },
  },
]
```

Rollout bucketing is a deterministic hash of `"<flag>:<subject>"`, so a given
user always lands in the same bucket as you widen the rollout. Bucket by a
different attribute with `"bucketBy": "orgId"`. Conditions support
`in`/`notIn`/`equals`/`notEquals`/`contains`/`startsWith`/`endsWith`, numeric
comparisons, and `exists`/`notExists`; all conditions in a rule are ANDed.

The evaluation **context** is open. By default it carries the user's id
(`targetingKey`), email, `emailVerified` and `language`; pass more attributes
(plan, org, role…) via the `overrides` argument as your domain grows:

```ts
await isEnabled('billing.enabled', { attributes: { plan: 'pro' } })
```

## Management CLI

```bash
pnpm --filter web flags list             # show configured flags
pnpm --filter web flags sync [key]       # create rows for catalogue flags (missing only)
pnpm --filter web flags enable <key>     # flip the kill switch on
pnpm --filter web flags disable <key>    # …off
pnpm --filter web flags remove <key>     # delete a flag's configuration
```

Every write runs in a transaction, **invalidates the cache**, and publishes a
`feature_flag.changed` domain event. The event handler records a structured
rollout-metric line — a durable, queryable trail of which flag flipped, by whom,
and when — pairing flags with the [event system](./events.md).

## Swapping the backend

Implement [`FlagProvider`](../apps/web/lib/feature-flags/provider.ts) (one
method, `resolve(key, context)`) for your backend and construct the client with
it in [`instance.ts`](../apps/web/lib/feature-flags/instance.ts). Nothing else
changes — the catalogue, typed client, server helpers and `<FeatureGate>` all
keep working.
