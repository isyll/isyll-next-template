# AGENTS.md

Canonical guide for AI agents (Claude Code, Codex, Copilot) working in this
repository. `CLAUDE.md` and `.github/copilot-instructions.md` defer to this file.

> **Next.js 16 is not the Next.js in your training data.** APIs and conventions
> changed (middleware → `proxy.ts`, async `cookies()`/`headers()`/`params`,
> Cache Components, `next lint` removed). When unsure, read
> `node_modules/next/dist/docs/` and heed deprecations.

## What this is

`next-monorepo-template` — a server-first Next.js 16 monorepo (pnpm +
Turborepo). See `PROJECT.md` for this project's purpose and scope.

## Layout

```text
apps/web                      Next.js 16 app (App Router, no src/ — app code at the package root)
packages/core                 framework-agnostic: Result, AppError, DTOs, env
packages/db                   Drizzle ORM + PostgreSQL (schema, migrations, DTOs)
packages/auth                 BetterAuth server + env-gated social providers
packages/ui                   shadcn/ui (Base UI) + swappable theme tokens
packages/{eslint,typescript}-config   shared strict configs
tests/load                    k6 load tests
```

## Golden rules

1. **Server-first.** Default to Server Components + Server Actions. The API
   routes are the two BetterAuth catch-alls (`/api/auth/[...all]` for users,
   `/admin/api/auth/[...all]` for admins). Use `next-safe-action`:
   `actionClient` / `authActionClient` (`apps/web/lib/safe-action.ts`) for user
   actions, `adminActionClient` (`apps/web/lib/admin-safe-action.ts`) for admin
   actions.
2. **Security.** Re-verify auth AND ownership inside every action/DAL — page or
   `proxy.ts` checks are not enough. Validate all input with Zod. Return DTOs,
   never raw rows. Operators (admins) are a **separate, isolated system**: their
   own BetterAuth instance (`@workspace/auth/admin`), DB schema + connection role
   (`@workspace/db/admin`), secret and cookies. Operators are provisioned (no
   self-signup); access is **PBAC** (`adminActionWithPermission`). Never mix the
   two systems.
3. **DB access** only through `@workspace/db` (`server-only`). Migrations are
   hand-written pure SQL (up/down) under `packages/db/migrations/`. Schema
   changes → `pnpm db:migrate:new <name>`, write the SQL, mirror it in the
   Drizzle schema (`packages/db/src/schema`), then `pnpm db:migrate`. The
   migration role is distinct from the app role (least privilege).
   - **Three Postgres schemas, always schema-qualified** (`public.`, `app.`,
     `admin.`) in every SQL statement: `public` = global reference data
     (currencies/countries/timezones) + shared functions/domains; `app` =
     end-user site data (users/sessions/accounts/verifications) + audit history;
     `admin` = isolated operators. **Table names are plural.**
   - **Soft-delete:** entity tables carry `deleted_at`; never hard-delete them.
     Filter with `notDeleted(table)` and remove via `softDelete(...)`.
   - **Audit + transactions:** mutations that must be atomic run inside
     `withTransaction` / `withAdminTransaction` (sets the audit actor); watched
     columns on audited tables are recorded automatically by a DB trigger.
4. **Env** is read via `@/env` (apps/web) or each package's validated env —
   never `process.env` directly in app code.
5. **i18n.** All user-facing text lives in `apps/web/messages/fr.json`; add keys,
   never hardcode strings. Localized validation uses async `inputSchema`
   factories (server) / `useTranslations` (client).
6. **Types.** Strictest TS 6 (no `any`, `import type`, exhaustive switches).
   Business logic uses `Result`/`AppError` from `@workspace/core`.
7. **Theming.** Use semantic tokens (`bg-primary`, `text-muted-foreground`).
   Rebrand by editing the `--brand-*` block in `packages/ui/src/styles/globals.css`.

## Platform services (already built — use these, don't reinvent)

All are concrete but env-gated: they degrade safely when the relevant env vars
are absent (dev).

- **Logging / errors.** `@/lib/logger` (pino, structured, secret-redacting,
  server-only) and `@/lib/observability` → `reportError(err, ctx)`, the single
  error choke-point. Server Actions already route errors through it. **Sentry**
  is wired for server/client/edge, env-gated on `SENTRY_DSN` (inert when unset);
  `reportError` forwards real bugs and rate-limit hits are tagged `security`.
  See `docs/observability.md`.
- **Rate limiting.** `@/lib/rate-limit` → `createRateLimiter` / `enforceRateLimit`
  (Redis/ioredis sliding window when `REDIS_URL` is set, in-process fallback
  otherwise). Use `rateLimitedActionClient` for sensitive/costly actions.
- **Email.** `@workspace/email` (React Email templates + Resend; console
  fallback in dev). Localized via `locale` (copy in `packages/email/src/i18n.ts`,
  built on `@workspace/core/i18n`). BetterAuth sends verification / password-reset
  emails through it in the user's `language`. Swap providers by re-implementing
  `sendEmail`.
- **Background jobs.** `@/lib/jobs` (pg-boss, Postgres-backed) → `enqueue` from
  actions, `work`/`schedule` in a worker process (`pnpm --filter web worker:jobs`
  runs the scheduled retention prune). No extra infra.
- **Tracing.** OpenTelemetry spans around Server Actions, the DAL, and the outbox
  relay, exported over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (no-op
  otherwise; Sentry owns tracing when its DSN is set). See `docs/observability.md`.
- **Object storage.** `@/lib/storage` (S3/R2/MinIO, presigned URLs, server-only)
  plus pure `@/lib/upload` helpers. Track files in `app.uploads` via its DAL.
- **Notifications.** `app.notifications` table + DAL under
  `apps/web/features/notifications`, with a bell + inbox UI, **realtime** unread
  badge over Server-Sent Events (Redis pub/sub, polling fallback), and
  **per-channel preferences** (`app.notification_preferences`). Send via
  `deliverNotification` (respects the channel preference + pushes realtime). See
  `docs/notifications.md`.
- **Feature flags.** `@/lib/feature-flags` → `isEnabled` / `getStringFlag` /
  `getNumberFlag` / `getJsonFlag` and the `<FeatureGate>` server component, gated
  per user (or any context attribute) with targeting rules + sticky percentage
  rollouts. The pure evaluation engine lives in `@workspace/core` (`evaluateFlag`);
  the DB-backed store (`app.feature_flags`) is cached two-tier (in-process + Redis)
  behind an OpenFeature-style `FlagProvider` seam. Flags are typed against the
  catalogue (`lib/feature-flags/catalog.ts`) and degrade to the catalogue default
  with no DB row. Manage with `pnpm --filter web flags <list|sync|enable|…>`; each
  change emits a `feature_flag.changed` event. See `docs/feature-flags.md`.
- **Domain events (outbox).** `publishEvent` (`@workspace/db`) writes a typed
  event to `app.outbox_events` in the same transaction as your change; the relay
  (`pnpm --filter web worker:outbox`) dispatches it to handlers in
  `apps/web/server/events`. Use for reliable side effects (email, notifications,
  webhooks). See `docs/events.md`.

## Enforcement & guardrails (these fail CI / block edits — don't fight them)

- **Module boundaries** (`pnpm boundaries`, dependency-cruiser): `core` depends
  on nothing internal; `db` → core only; `ui` stays presentational; `auth` →
  core + db; packages never import the app; no cycles.
- **Strict ESLint** (type-aware): no `any`, no non-null assertions, exhaustive
  switches, and **no raw `process.env` in `apps/web`** (use `@/env`).
- **Agent hooks** (`.claude/hooks/guard.mjs`): pre-block raw `process.env` in
  app code and `"use client"` in data-access files before the edit lands.
- **Coverage thresholds** on `@workspace/core` (95% lines/functions/statements,
  90% branches) — add tests when you add foundation code.
- **Security CI:** CodeQL SAST, gitleaks secret scan, dependency review.

## Commands

| Task          | Command                                            |
| ------------- | -------------------------------------------------- |
| Dev           | `pnpm dev`                                         |
| Full check    | `pnpm check`                                       |
| Lint / types  | `pnpm lint` · `pnpm typecheck`                     |
| Boundaries    | `pnpm boundaries`                                  |
| Test / e2e    | `pnpm test` · `pnpm test:e2e`                      |
| Add UI        | `pnpm ui:add <component>`                          |
| DB migrate    | `pnpm db:migrate` · `pnpm db:rollback`             |
| New migration | `pnpm db:migrate:new <name>`                       |
| SQL lint      | `pnpm sql:lint` · `pnpm sql:fix`                   |
| Seed / studio | `pnpm db:seed` · `pnpm db:studio`                  |
| New operator  | `pnpm admin:create-operator`                       |
| Init project  | `pnpm project:init`                                |
| Bump version  | `pnpm version:bump <patch\|minor\|major\|v=x.y.z>` |

## Commit rules (STRICT)

- Conventional Commits: `type(scope): subject`. Lowercase subject, ≤72-char
  header, no trailing period. Allowed scopes are in `commitlint.config.ts`.
- **Create a conventional commit after each completed task.**
- **Never** add `Co-Authored-By` trailers or AI attribution to commits.
- Run `pnpm check` before considering work done.
- **Branches.** Two long-lived branches: `development` (integration — open PRs
  here; CI lint/typecheck/test/build + E2E run on it) and `production` (the
  deploy target). Feature branches (`feat/...`, `fix/...`) branch off
  `development`.
