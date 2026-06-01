# Next Monorepo Template

A server-first **Next.js 16** monorepo template (pnpm + Turborepo) for building
modern, high-traffic web apps fast — strict TypeScript, authentication,
database, i18n and a complete quality/CI toolchain out of the box.

> New project? Run `pnpm project:init` (or the `/start-project` agent command)
> to rename and record the brief in `PROJECT.md`.

## Stack

- **Next.js 16** App Router · **React 19** · **TypeScript 6** (strict, type-aware)
- **Tailwind CSS 4** · **shadcn/ui** (Base UI) with swappable theme tokens
- **BetterAuth** — email/password + env-gated Google / Facebook / Microsoft / Apple
- **Drizzle ORM** + **PostgreSQL** — SQL migrations, seed, typed DTOs
- **next-intl** (French) · **TanStack Query** · **next-safe-action** · **Zod 4**
- **ESLint 10** · **Prettier** · **commitlint** · **husky** · **cspell**
- **Vitest** · **Playwright** · **k6** · **GitHub Actions** · **Dependabot**

## Quick start

```bash
pnpm install
cp .env.example .env            # set DATABASE_URL, BETTER_AUTH_SECRET, ...
pnpm db:migrate                 # apply migrations (needs a running Postgres)
pnpm db:seed                    # optional: seed demo data
pnpm dev                        # http://localhost:3000
```

Generate a secret: `openssl rand -base64 32`. Social providers are optional —
a provider is enabled only when its credentials are present in `.env`.

## Workspace

```text
apps/web        Next.js app (App Router, server-first)
packages/core   Result / AppError / DTO + pagination primitives, env validation
packages/db     Drizzle schema, client, validators, migrations, seed
packages/auth   BetterAuth server + social provider gating
packages/ui     shadcn/ui (Base UI) components + theme tokens
packages/*-config   shared ESLint / TypeScript configs
tests/load      k6 load tests
```

## Scripts

| Command                      | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `pnpm dev`                   | Run all apps in watch mode                         |
| `pnpm build`                 | Production build                                   |
| `pnpm check`                 | lint + typecheck + test + build + spellcheck + fmt |
| `pnpm lint`                  | ESLint (type-aware) across the workspace           |
| `pnpm typecheck`             | `tsc --noEmit` across the workspace                |
| `pnpm test`                  | Vitest unit/component tests                        |
| `pnpm test:e2e`              | Playwright end-to-end tests                        |
| `pnpm test:load`             | k6 load test (`BASE_URL` env)                      |
| `pnpm ui:add <c>`            | Add a shadcn component to `packages/ui`            |
| `pnpm db:migrate:new <name>` | Scaffold a numbered up/down SQL migration          |
| `pnpm db:migrate`            | Apply pending migrations                           |
| `pnpm db:rollback`           | Roll back the last migration                       |
| `pnpm db:studio`             | Open Drizzle Studio                                |
| `pnpm project:init`          | Initialize the template for a new project          |

## Conventions

- **Server-first**: Server Components + Server Actions; the only API route is
  the BetterAuth handler. Re-verify auth and ownership inside every action.
- **Theming**: edit the `--brand-*` block in
  `packages/ui/src/styles/globals.css` to rebrand in one place.
- **i18n**: all UI text lives in `apps/web/messages/fr.json`.
- **Commits**: Conventional Commits (strict), enforced by commitlint + husky.
- **Cache Components**: opt in via `cacheComponents: true` in `next.config.ts`
  once you wrap dynamic reads in `<Suspense>`.

See [`AGENTS.md`](./AGENTS.md) for the full guide used by AI agents.

## License

UNLICENSED — private template.
