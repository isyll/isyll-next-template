# AGENTS.md

Canonical guide for AI agents (Claude Code, Codex, Copilot) working in this
repository. `CLAUDE.md` and `.github/copilot-instructions.md` defer to this file.

> **Next.js 16 is not the Next.js in your training data.** APIs and conventions
> changed (middleware → `proxy.ts`, async `cookies()`/`headers()`/`params`,
> Cache Components, `next lint` removed). When unsure, read
> `node_modules/next/dist/docs/` and heed deprecations.

## What this is

`isyll-next-template` — a server-first Next.js 16 monorepo template (pnpm +
Turborepo) used as the base for new client/product projects. See `PROJECT.md`
for the **current** project's brief (created by `pnpm project:init`).

## Layout

```text
apps/web                      Next.js 16 app (App Router, src/)
packages/core                 framework-agnostic: Result, AppError, DTOs, env
packages/db                   Drizzle ORM + PostgreSQL (schema, migrations, DTOs)
packages/auth                 BetterAuth server + env-gated social providers
packages/ui                   shadcn/ui (Base UI) + swappable theme tokens
packages/{eslint,typescript}-config   shared strict configs
tests/load                    k6 load tests
```

## Golden rules

1. **Server-first.** Default to Server Components + Server Actions. The only API
   route is `/api/auth/[...all]`. Use `next-safe-action` (`actionClient`,
   `authActionClient`, `adminActionClient` in `apps/web/src/lib/safe-action.ts`).
2. **Security.** Re-verify auth AND ownership inside every action/DAL — page or
   `proxy.ts` checks are not enough. Validate all input with Zod. Return DTOs,
   never raw rows.
3. **DB access** only through `@workspace/db` (`server-only`). Schema changes →
   edit `packages/db/src/schema`, then `pnpm db:generate` and commit the
   migration in `packages/db/drizzle/`.
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

| Task           | Command                                |
| -------------- | -------------------------------------- |
| Dev            | `pnpm dev`                             |
| Full check     | `pnpm check`                           |
| Lint / types   | `pnpm lint` · `pnpm typecheck`         |
| Test / e2e     | `pnpm test` · `pnpm test:e2e`          |
| Add UI         | `pnpm ui:add <component>`              |
| DB migrate     | `pnpm db:generate` · `pnpm db:migrate` |
| Seed / studio  | `pnpm db:seed` · `pnpm db:studio`      |
| Regen auth SQL | `pnpm auth:generate`                   |
| New project    | `pnpm project:init`                    |

## Commit rules (STRICT)

- Conventional Commits: `type(scope): subject`. Lowercase subject, ≤72-char
  header, no trailing period. Allowed scopes are in `commitlint.config.ts`.
- **Create a conventional commit after each completed task.**
- **Never** add `Co-Authored-By` trailers or AI attribution to commits.
- Run `pnpm check` before considering work done.
