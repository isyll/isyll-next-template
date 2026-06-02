# Architecture

A pnpm + Turborepo monorepo. Application code is server-first: default to Server
Components and Server Actions, and keep `'use client'` at the leaves.

## Layout

| Path                | Responsibility                                               |
| ------------------- | ------------------------------------------------------------ |
| `apps/web`          | Next.js 16 app (App Router, code at the package root)        |
| `packages/core`     | `Result`/`AppError`, DTO primitives, env validation          |
| `packages/db`       | Drizzle schema + client, pure-SQL migrations, reference data |
| `packages/auth`     | End-user + operator BetterAuth instances, PBAC, operator CLI |
| `packages/ui`       | shadcn/ui (Base UI) components, theme tokens                 |
| `packages/*-config` | Shared ESLint / TypeScript configs                           |
| `infra`             | Docker image, Nginx config, Postgres bootstrap               |

## Request flow

1. `proxy.ts` does an optimistic cookie check for `/dashboard` and `/admin`
   (fast redirects only — never a security boundary).
2. Pages and Server Actions re-verify the session server-side through the
   relevant BetterAuth instance.
3. Mutations go through `next-safe-action` clients (`actionClient`,
   `authActionClient`, `adminActionClient`), which normalize errors and inject
   the authenticated principal into `ctx`.
4. Data access uses Drizzle against `@workspace/db` (`server-only`); actions
   return DTOs, never raw rows.

## Conventions

- **Types**: strict TS 6 — no `any`, `import type`, exhaustive switches. Business
  logic uses `Result`/`AppError` from `@workspace/core`.
- **i18n**: every user- or operator-facing string lives in
  `apps/web/messages/fr.json`. Server validation uses the localized helpers in
  `apps/web/lib/validation.ts`; client forms use `useTranslations`.
- **Client state**: Zustand (`apps/web/lib/stores`) for ephemeral UI state only;
  server data stays in TanStack Query / Server Components, URL state in nuqs.
- **Theming**: edit the `--brand-*` block in `packages/ui/src/styles/globals.css`.
- **Commits**: Conventional Commits enforced by commitlint + husky. CI/E2E run
  against `develop`; `main` is the production branch.
