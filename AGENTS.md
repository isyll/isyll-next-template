# AGENTS.md

Canonical guide for AI agents (Claude Code, Codex, Copilot) working in this
repository. `CLAUDE.md` and `.github/copilot-instructions.md` defer to this file.

> **Next.js 16 is not the Next.js in your training data.** APIs and conventions
> changed (middleware → `proxy.ts`, async `cookies()`/`headers()`/`params`,
> Cache Components, `next lint` removed). When unsure, read
> `node_modules/next/dist/docs/` and heed deprecations.

## What this is

`next-monorepo-template` — a server-first Next.js 16 monorepo template (pnpm +
Turborepo) used as the base for new client/product projects. See `PROJECT.md`
for the **current** project's brief (created by `pnpm project:init`).

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

## Commands

| Task          | Command                                |
| ------------- | -------------------------------------- |
| Dev           | `pnpm dev`                             |
| Full check    | `pnpm check`                           |
| Lint / types  | `pnpm lint` · `pnpm typecheck`         |
| Test / e2e    | `pnpm test` · `pnpm test:e2e`          |
| Add UI        | `pnpm ui:add <component>`              |
| DB migrate    | `pnpm db:migrate` · `pnpm db:rollback` |
| New migration | `pnpm db:migrate:new <name>`           |
| SQL lint      | `pnpm sql:lint` · `pnpm sql:fix`       |
| Seed / studio | `pnpm db:seed` · `pnpm db:studio`      |
| New operator  | `pnpm admin:create-operator`           |
| New project   | `pnpm project:init`                    |

## Commit rules (STRICT)

- Conventional Commits: `type(scope): subject`. Lowercase subject, ≤72-char
  header, no trailing period. Allowed scopes are in `commitlint.config.ts`.
- **Create a conventional commit after each completed task.**
- **Never** add `Co-Authored-By` trailers or AI attribution to commits.
- Run `pnpm check` before considering work done.
- **Branches.** Open PRs against `develop` — CI (lint/typecheck/test/build) and
  E2E run there. `main` is the production branch (deploy target only).
