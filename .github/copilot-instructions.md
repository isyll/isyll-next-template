# GitHub Copilot instructions

This is **isyll-next-template** — an ultra-powerful, server-first Next.js 16
monorepo template (pnpm + Turborepo). Follow these rules in every suggestion.

## Stack

- **Next.js 16** App Router (React 19, Turbopack), **TypeScript 6** (strict,
  type-aware), **Tailwind 4** + **shadcn/ui** (Base UI, base-luma).
- **BetterAuth** (not NextAuth), **Drizzle ORM** + PostgreSQL, **next-intl**
  (French), **TanStack Query**, **next-safe-action**, **Zod 4**.
- Packages: `@workspace/core` (Result/errors/DTOs), `@workspace/db`,
  `@workspace/auth`, `@workspace/ui`, shared `eslint-config` /
  `typescript-config`. App: `apps/web`.

## Architecture rules

- **Server-first.** Default to Server Components + Server Actions. Avoid API
  routes (the only one is `/api/auth/[...all]`). Use `next-safe-action` clients
  (`authActionClient` for authenticated mutations).
- Data access lives in **server-only** modules (DAL), validated with Zod;
  return DTOs, never raw rows to clients. Re-verify auth + ownership inside
  every action (page-level auth does not protect actions).
- DB access only via `@workspace/db` (`import 'server-only'`); never from a
  Client Component. Schema changes require a committed Drizzle migration.
- Read env via `@/env` (typed), never `process.env` directly in app code.
- All user-facing strings go through next-intl (`messages/fr.json`). Add keys,
  don't hardcode text.
- Reference colours via semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`).

## Conventions

- **Conventional Commits**, strictly. Type + kebab-case scope, lowercase
  subject, ≤72-char header. **Never add `Co-Authored-By` trailers.**
- Create a conventional commit after each completed task.
- TypeScript is strictest: no `any`, prefer `import type`, exhaustive switches,
  `Result`/`AppError` from `@workspace/core` for business logic.
- Run `pnpm check` (lint + typecheck + test + build + spellcheck + format)
  before proposing a change is complete.

See `AGENTS.md` for the full agent guide.
