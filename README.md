# Next Monorepo Template

A server-first **Next.js 16** monorepo (pnpm + Turborepo) for building modern,
high-traffic products fast: strict TypeScript, two fully isolated authentication
systems, pure-SQL migrations with embedded ISO reference data, i18n, Docker +
Nginx infrastructure, and a complete quality/CI toolchain.

> New project? Run `pnpm project:init` (or the `/start-project` agent command)
> to rename everything, generate secrets, and record the brief in `PROJECT.md`.

## Stack

- **Next.js 16** App Router · **React 19** · **TypeScript 6** (strict, type-aware)
- **Tailwind CSS 4** · **shadcn/ui** (Base UI) with swappable theme tokens
- **BetterAuth** — separate end-user and operator (admin) instances
- **Drizzle ORM** (typed queries) + a **Node SQL migration runner** (pure-SQL up/down migrations)
- **PostgreSQL** with least-privilege roles, immutable reference data, PBAC
- **next-intl** · **TanStack Query** · **next-safe-action** · **Zod 4** · **Zustand**
- **Docker** (multi-stage) + **Nginx** reverse proxy · least-privilege Postgres
- **ESLint 10** · **Prettier** · **SQLFluff** · **commitlint** · **husky** · **cspell**
- **Vitest** · **Playwright** · **k6** · **GitHub Actions** · **Dependabot**

## Quick start

```bash
pnpm install
docker compose up -d                 # local Postgres + Adminer
pnpm project:init                    # rename, generate .env secrets
pnpm db:migrate                      # apply migrations
pnpm db:seed                         # optional sample users
pnpm admin:create-operator --email you@example.com --name "You" --super
pnpm dev                             # http://localhost:3000
```

Migrations are plain SQL applied by a small Node runner (`pnpm db:migrate`) — no
external binary to install. In Docker, run them through the one-shot `migrator`
service (`docker compose -f compose.prod.yaml run --rm migrator`). Social
providers are optional — each is enabled only when its credentials are present
in `.env`.

Prefer a container? Open the repo in VS Code and **Reopen in Container** (or
launch a Codespace): `.devcontainer/` brings up the app, Postgres, Redis and
Adminer with the toolchain preinstalled. See `docs/infrastructure.md`.

## Architecture

- **Two isolated auth systems.** End users (`@workspace/auth`, `public` schema,
  cookie `app`) and operators (`@workspace/auth/admin`, `admin` schema, cookie
  `admin`) never share tables, roles, secrets, cookies, or code paths. Operators
  are provisioned — never self-service — and access is **PBAC** (operators →
  roles → permissions). The whole `/admin` surface is blocked by Nginx in prod.
- **Database.** Pure-SQL `up.sql`/`down.sql` migrations, one table each. ISO
  reference data (currencies, countries, timezones) is embedded and immutable.
  The app, migrator, and operator service each connect with a distinct role.
- **Server-first.** Server Components + Server Actions; re-verify auth and
  ownership in every action via the safe-action clients.

## Workspace

```text
apps/web        Next.js app (App Router, server-first, no src/)
packages/core   Result / AppError / DTO primitives, env validation
packages/db     Drizzle schema + client, pure-SQL migrations, reference data
packages/auth   BetterAuth end-user + operator instances, PBAC, operator CLI
packages/ui     shadcn/ui (Base UI) components + theme tokens
packages/*-config   shared ESLint / TypeScript configs
infra/          Docker image, Nginx config, Postgres role + extension bootstrap
tests/load      k6 load tests
```

## Documentation

- [docs/architecture.md](./docs/architecture.md) — layout, conventions, request flow
- [docs/database.md](./docs/database.md) — migrations, reference data, roles, Drizzle
- [docs/auth.md](./docs/auth.md) — user vs operator auth, PBAC, operator provisioning
- [docs/infrastructure.md](./docs/infrastructure.md) — Docker, Nginx, environment
- [AGENTS.md](./AGENTS.md) — the canonical guide for AI agents

## Scripts

| Command                        | Description                                        |
| ------------------------------ | -------------------------------------------------- |
| `pnpm dev`                     | Run all apps in watch mode                         |
| `pnpm check`                   | lint + typecheck + test + build + spellcheck + fmt |
| `pnpm test` · `test:e2e`       | Vitest · Playwright                                |
| `pnpm db:migrate` · `rollback` | Apply / roll back SQL migrations                   |
| `pnpm db:migrate:new <name>`   | Scaffold a numbered up/down migration              |
| `pnpm db:reference:generate`   | Regenerate the ISO reference-data migrations       |
| `pnpm sql:lint` · `sql:fix`    | SQLFluff lint / fix the migrations                 |
| `pnpm admin:sync-permissions`  | Sync the PBAC permission catalogue to the database |
| `pnpm admin:create-operator`   | Provision an operator account                      |
| `pnpm project:init`            | Initialize the template for a new project          |

## License

UNLICENSED — public template.
