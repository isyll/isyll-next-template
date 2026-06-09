# Roadmap — making the template production-grade

This document proposes improvements and new features to take this template from
"excellent foundation" to "ready for large, serious, long-lived projects." Each
phase is independently shippable and ordered so earlier phases de-risk later
ones. It closes with a recommendation on the **primary-key / ID strategy**.

> **Shipped already** (removed from the list below): the original Phase 1 — DX &
> startup (devcontainer/Codespaces, the production worker, brand theme presets,
> and full `project:init` de-templating); CI/CD deployment (VPS over SSH,
> disabled by default, and Codespaces previews); and part of the security phase —
> `pnpm audit` CI gating, signed-commit guidance, and a `CSP_REPORT_ONLY` /
> `report-uri` rollout path. See `docs/deployment.md`, `docs/theming.md`, and
> `docs/security.md`.

Guiding principles, unchanged from the existing template:

- **Server-first, typed, secure by default.** Everything new keeps the
  `Result`/`AppError`, Zod-validated, DTO-returning, re-verify-in-the-DAL style.
- **Concrete but env-gated.** Ship working defaults that degrade safely without
  an account configured (the pattern in
  [ADR-0004](./adr/0004-concrete-vendors-behind-seams.md)).
- **One edit to rebrand, minutes to a running project.** Customization lives in
  a few well-known places (`siteConfig`, `--brand-*`, `PROJECT.md`,
  `project:init`).

---

## Phase 1 — Security & reliability hardening

- **Distributed tracing.** Sentry already routes errors through the
  `reportError` choke-point (env-gated on `SENTRY_DSN`). Add OpenTelemetry traces
  around actions, the DAL, and the outbox relay.
- **2FA / passkeys.** Add BetterAuth's TOTP + WebAuthn plugins for end users and
  **require** a second factor for operators.
- **Audit coverage + retention.** Extend the audit trigger to more tables and
  add a scheduled job to prune/`processed`-archive `outbox_events` and old
  audit rows.

## Phase 2 — Product building blocks

Things almost every serious app re-implements; ship them once, well.

- **User-facing RBAC.** Generalize the operator PBAC into a reusable
  roles/permissions module usable by end users (teams/orgs).
- **Billing.** Stripe integration behind a seam: customer/subscription tables,
  webhooks routed through the **outbox** for reliability, a billing portal page.
- **Notifications UI.** A bell + inbox built on the existing `app.notifications`
  DAL, with realtime updates (SSE) and per-channel preferences.
- **File management.** Upload UI on top of `@/lib/storage` + `app.uploads`
  (drag-drop, presigned direct upload, image variants).
- **Search.** Postgres full-text (the `pg_trgm` indexes already exist) with a
  typed query builder, upgradeable to an external engine later.
- **Feature flags.** A tiny flag service (DB-backed, cached in Redis) gating
  features per user/org — pairs with the event system for rollout metrics.

## Phase 3 — Scale & operations

- **Caching layer.** A typed cache helper over the existing Redis client
  (`redisGet/redisSet`) with tag-based invalidation tied to domain events.
- **Read replicas.** Teach the Drizzle client about a read pool; route DAL reads
  to replicas, writes/transactions to primary.
- **Multitenancy option.** A documented pattern (schema-per-tenant or
  `tenant_id` + RLS) and an `init` flag to scaffold it.
- **Background-job dashboard + DLQ tooling.** A small operator page to inspect
  `dead` outbox rows and pg-boss queues, with replay.

## Phase 4 — Quality & polish

- **Component workbench.** Storybook (or Ladle) for `@workspace/ui` + visual
  regression in CI.
- **E2E + a11y coverage.** Expand Playwright to the auth flows and dashboard;
  add `axe` checks and Lighthouse/perf budgets in CI.
- **Email previews in CI.** Snapshot the rendered templates (per locale) so copy
  changes are reviewable.
- **More locales.** The i18n plumbing (core registry, `messages/*.json`, email
  dictionaries, `users.language`) already supports it — add `en` and a switcher
  test.

---

## Primary-key / ID strategy

> _Question: an alternative to UUIDs (too long, ugly format) that isn't
> sequential like `BIGINT` (guessable/enumerable), but is still efficient for
> `SELECT` and suitable for PostgreSQL._

### The trade-off

| Option                      | Storage          | Sortable / index-friendly | Enumerable?      | Display            |
| --------------------------- | ---------------- | ------------------------- | ---------------- | ------------------ |
| `bigint` identity           | 8 B              | ✅ perfect                | ❌ **guessable** | short, numeric     |
| `uuid` v4 (today's default) | 16 B             | ❌ random → index churn   | ✅ safe          | 36-char, ugly      |
| **`uuid` v7**               | 16 B             | ✅ time-ordered           | ✅ safe          | 36-char, ugly      |
| **ULID**                    | 16 B (as `uuid`) | ✅ time-ordered           | ✅ safe          | **26-char, clean** |
| nanoid (text)               | ~21 B text       | ❌ random                 | ✅ safe          | short, clean       |
| Snowflake (`bigint`)        | 8 B              | ✅ time-ordered           | ⚠️ somewhat      | short, numeric     |

Random `uuid` v4 (the current default via `gen_random_uuid()`) is safe but hurts
write throughput and index locality because each insert lands in a random spot
of the B-tree. The two modern fixes are **time-ordered 128-bit IDs**.

### Recommendation

**Adopt time-ordered 128-bit IDs, stored in the native `uuid` column, and
present them as ULIDs (or prefixed IDs) at the application boundary.** This gives
you, all at once:

- compact 16-byte storage and a fast, cache-friendly B-tree (time-ordered
  inserts append to the right of the index);
- non-enumerable keys (no "guess the next id");
- a clean **26-character, hyphen-free, URL-safe** external format (ULID), or
  Stripe-style **prefixed IDs** (`usr_01J9…`) that are self-describing in logs.

Two concrete ways to get there, pick by your Postgres version:

1. **UUID v7 in the database (simplest).** On **PostgreSQL 18+** use the built-in
   `uuidv7()`; on 14–17 add the `pg_uuidv7` extension. Change the column default
   and keep the `uuid` type:

   ```sql
   -- migration
   ALTER TABLE app.notifications
     ALTER COLUMN id SET DEFAULT uuidv7();
   ```

   ```ts
   // packages/db/src/schema/_helpers.ts — a shared PK helper
   import { sql } from 'drizzle-orm'
   import { uuid } from 'drizzle-orm/pg-core'

   export const primaryId = () =>
     uuid('id')
       .primaryKey()
       .default(sql`uuidv7()`)
   ```

   You keep the `uuid` type everywhere; only the _ordering_ improves. Accept the
   36-char display, or render ULID/prefixed forms in the API layer.

2. **ULID generated in the app (nicest format).** Generate a ULID, store its 128
   bits in the `uuid` column, and encode/decode at the edge. Use a branded type
   (the repo already has [`@workspace/core/branded`](../packages/core/src/branded.ts))
   so a `UserId` can't be passed where an `OrderId` is expected:

   ```ts
   import { ulid } from 'ulidx'

   // store: ULID → uuid bytes; display: uuid → ULID string
   export const newId = () => ulid() // e.g. 01J9Z7K8Q9X2…
   ```

   For **public** identifiers, wrap with a prefix (`usr_`, `ord_`) via a tiny
   codec; keep the bare `uuid` internal.

### Migration notes for this template

- Domain tables (`notifications`, `uploads`, `outbox_events`, `audit_logs`,
  `permissions`, `roles`) use `uuid('id').defaultRandom()` — switching them is a
  one-line default change plus the `primaryId()` helper above; no type change, so
  existing data and FKs are unaffected.
- The BetterAuth tables (`users`, `accounts`, …, `operators`) use **text** IDs
  generated by BetterAuth. Override its generator centrally via
  `advanced.database.generateId` in
  [`packages/auth/src/auth.ts`](../packages/auth/src/auth.ts) (and `admin-auth.ts`)
  to emit ULIDs/prefixed IDs, keeping the two systems consistent.
- **Don't** mix strategies per table without reason — pick one (UUID v7 _or_
  ULID-as-uuid) and apply it via the shared helper so it stays consistent.

**Bottom line:** keep the `uuid` _column_ (16 bytes, great Postgres support,
stable FKs), switch the _generator_ to time-ordered (UUID v7 or ULID), and
choose the _display_ format you like (ULID or prefixed). That satisfies all
three goals — not sequential, fast on `SELECT`/insert, and a far nicer format
than v4.
