# Roadmap

Remaining work toward a production-grade foundation. Each phase is independently
shippable and ordered so earlier phases de-risk later ones. It closes with the
**primary-key / ID strategy**.

> **Shipped already** (not listed below): the DX & startup phase
> (devcontainer/Codespaces, the production worker, brand theme presets,
> `project:init`); CI/CD deployment (VPS over SSH, disabled by default, plus
> Codespaces previews); the first security pass — `pnpm audit` CI gating,
> signed-commit guidance, and a `CSP_REPORT_ONLY` / `report-uri` rollout path;
> and the security & reliability hardening pass — OpenTelemetry/OTLP distributed
> tracing (one endpoint env var), extended audit coverage, and a scheduled
> retention job. See `docs/deployment.md`, `docs/theming.md`, `docs/security.md`,
> and `docs/observability.md`.

Guiding principles:

- **Server-first, typed, secure by default.** Everything new keeps the
  `Result`/`AppError`, Zod-validated, DTO-returning, re-verify-in-the-DAL style.
- **Concrete but env-gated.** Ship working defaults that degrade safely without
  an account configured (the pattern in
  [ADR-0004](./adr/0004-concrete-vendors-behind-seams.md)).
- **Accessible by default.** Target **WCAG 2.2 AA**: semantic HTML,
  keyboard-operable and screen-reader-friendly components, visible focus,
  sufficient contrast, and `prefers-reduced-motion` support — enforced in CI,
  never bolted on later.
- **One edit to rebrand.** Customization lives in a few well-known places
  (`siteConfig`, `--brand-*`, `PROJECT.md`, `project:init`).

---

## Phase 1 — Product building blocks ✅ Shipped

Things almost every serious app re-implements; shipped once, well.

- **Feature flags.** DB-backed flag service cached in Redis, gating features per
  user (or any context attribute) with targeting rules + sticky percentage
  rollouts; pure evaluation engine in `@workspace/core` behind an
  OpenFeature-style provider seam. See `docs/feature-flags.md`.
- **Search.** Postgres full-text — generated `tsvector` column + GIN index and
  `websearch_to_tsquery` — combined with `pg_trgm` for typo-tolerant
  autocomplete, behind a typed query builder. See `docs/search.md`.
- **File management.** Drag-and-drop upload UI on `@/lib/storage` + `app.uploads`
  with presigned direct upload and an image-preview gallery. See `docs/storage.md`.
- **Notifications UI.** A bell + inbox on `app.notifications` with realtime
  updates (SSE over Redis pub/sub) and per-channel preferences. See
  `docs/notifications.md`.
- **Billing.** Stripe behind a seam: `billing_customers` / `subscriptions`
  tables, webhooks routed through the **outbox** for reliability, and a
  billing-portal page. See `docs/billing.md`.

## Phase 2 — Scale & operations ✅ Shipped

- **Caching layer.** `@/lib/cache` — a typed read-through cache over the shared
  Redis client for cross-instance data, with tag-group invalidation wired to the
  matching domain event (the `billing.webhook` handler drops a user's cached
  subscription). Shares one `cacheTags`/`cacheKeys` vocabulary with Next 16 Cache
  Components (`use cache` + `cacheTag`/`revalidateTag`, opt-in per page) for
  render caching. No-ops without `REDIS_URL`. See `docs/caching.md`.
- **Read replicas.** The Drizzle client learned a read pool: set
  `DATABASE_REPLICA_URL` (and the admin equivalent) to route standalone reads via
  `getReadDb()`/`dbRead` to a follower while writes/transactions stay on the
  primary. Transaction-aware (read-your-writes preserved); reads that gate a
  write or an authz decision deliberately stay on the primary. See
  `docs/database.md`.
- **Multitenancy option.** A documented pattern (`tenant_id` + Postgres RLS, or
  schema-per-tenant) plus `project:init --multitenancy <rls|schema>` to record
  the decision and scaffold the RLS foundation. See `docs/multitenancy.md`.
- **Background-job dashboard + DLQ tooling.** An operator page (`/admin/jobs`,
  PBAC `jobs.read`/`jobs.write`) inspecting outbox status, pg-boss queue backlog,
  and the dead-letter queue, with replay (single / all-dead) and discard. See
  `docs/jobs.md`.

## Phase 3 — Quality, accessibility & polish

- **Accessibility as a CI gate (WCAG 2.2 AA).** `axe-core` assertions inside
  Playwright and an `eslint-plugin-jsx-a11y` pass; verified keyboard navigation
  and visible focus on every interactive component; `prefers-reduced-motion`
  honored in the motion layer; semantic landmarks/headings and labelled form
  controls; contrast checked against the theme tokens; and a manual
  screen-reader pass (VoiceOver / NVDA) on the auth and dashboard flows.
- **Component workbench.** Storybook (or Ladle) for `@workspace/ui` with the a11y
  addon + visual-regression snapshots in CI.
- **E2E coverage.** Expand Playwright to the auth flows and dashboard; add
  Lighthouse / performance budgets in CI.
- **Email previews in CI.** Snapshot the rendered templates per locale so copy
  changes are reviewable.
- **More locales.** The i18n plumbing (core registry, `messages/*.json`, email
  dictionaries, `users.language`) already supports it — add `en` and a
  locale-switcher test.

---

## Primary-key / ID strategy

> _Goal: an identifier that isn't sequential/enumerable like `bigint`, stays
> compact and index-friendly for Postgres, and avoids the write-amplification of
> random `uuid` v4._

### Recommendation: time-ordered `uuid` v7

The current default, random `uuid` v4 (`gen_random_uuid()`), is safe but hurts
insert throughput and index locality — every row lands at a random spot in the
B-tree. **`uuid` v7 fixes this:** it is a standard 128-bit UUID whose high bits
are a millisecond timestamp, so inserts are time-ordered (they append to the
right of the index) while the value stays non-enumerable.

PostgreSQL 18 — which this project already runs — ships a built-in
**`uuidv7()`**, so no extension or app-side library is needed for DB-generated
keys.

| Option                 | Storage | Index-friendly  | Enumerable?  |
| ---------------------- | ------- | --------------- | ------------ |
| `bigint` identity      | 8 B     | ✅              | ❌ guessable |
| `uuid` v4 (today)      | 16 B    | ❌ random churn | ✅ safe      |
| **`uuid` v7 (target)** | 16 B    | ✅ time-ordered | ✅ safe      |

Keep the native `uuid` column type everywhere (16 bytes, first-class Postgres
support, stable FKs) and switch only the _generator_. The 36-character text form
is accepted as-is — no ULID, prefixed IDs, or external encoders.

### How to adopt it

1. **A shared Drizzle PK helper**, so every table stays consistent:

   ```ts
   // packages/db/src/schema/_helpers.ts
   import { sql } from 'drizzle-orm'
   import { uuid } from 'drizzle-orm/pg-core'

   export const primaryId = () =>
     uuid('id')
       .primaryKey()
       .default(sql`uuidv7()`)
   ```

2. **Edit the migration SQL in place — do not add `ALTER TABLE` migrations.**
   This is pre-production, so change the default directly in each table's
   existing `up.sql` and mirror it in the Drizzle schema:

   ```sql
   -- in each table's up.sql, replacing gen_random_uuid()
   id uuid PRIMARY KEY DEFAULT uuidv7()
   ```

   The domain tables (`notifications`, `uploads`, `outbox_events`, `audit_logs`,
   `permissions`, `roles`) move with this one-line change — the column type is
   unchanged, so foreign keys and existing rows are unaffected.

3. **BetterAuth tables** (`users`, `accounts`, …, `operators`) generate **text**
   IDs in application code. Override the generator centrally via
   `advanced.database.generateId` in
   [`packages/auth/src/auth.ts`](../packages/auth/src/auth.ts) (and
   `admin-auth.ts`) to emit a uuid v7 string (e.g. the `uuid` package's `v7()`),
   keeping both auth systems consistent with the domain tables.

**Bottom line:** keep the `uuid` column, switch the generator to PostgreSQL 18's
built-in `uuidv7()`, and apply it everywhere through the shared helper —
non-sequential, non-enumerable, fast on insert and `SELECT`, with no new
dependencies on the database side.
