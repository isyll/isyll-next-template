# Contributing

> Working as an AI agent? Read [`AGENTS.md`](./AGENTS.md) first — it is the
> canonical engineering guide and overrides anything inferred from training data.

## Setup

```bash
pnpm install
docker compose up -d            # local Postgres
cp .env.example .env            # then fill in secrets (or run pnpm project:init)
pnpm db:migrate
pnpm dev
```

## Workflow

1. Branch off `development` (e.g. `feat/...`, `fix/...`).
2. Make the change. Prefer Server Components + Server Actions; keep `'use client'`
   at the leaves; reuse the [platform services](./AGENTS.md#platform-services-already-built--use-these-dont-reinvent).
3. Add/adjust tests. `@workspace/core` is held to coverage thresholds.
4. Run `pnpm check` — it must pass before review:
   `lint · typecheck · test · build · boundaries · spellcheck · format`.
5. Commit using Conventional Commits (see _Commit rules_ below).
6. Open a PR against `development`. CI (quality matrix, CodeQL, gitleaks) must be green.

## Commit rules (strict, enforced by commitlint)

- Format: `type(scope): subject` — lowercase subject, **≤72-char header**, no
  trailing period. Allowed types/scopes are in `commitlint.config.ts`.
- Create a commit per completed, coherent change.
- **Never** add `Co-Authored-By` trailers or any AI attribution.

## Hard rules (machine-checked)

These fail CI or are blocked by an agent hook — design with them, not around them:

- **Architecture boundaries** (`pnpm boundaries`): `core` depends on nothing
  internal · `db` → core only · `ui` stays presentational · `auth` → core + db
  · packages never import the app · no cycles.
- **No raw `process.env` in `apps/web`** — use the validated `@/env`.
- **DB access only via `@workspace/db`**; schema changes are a hand-written
  pure-SQL migration mirrored into the Drizzle schema.
- **Soft-delete, never hard-delete** entity rows; filter with `notDeleted(...)`.
- **Strictest TypeScript**: no `any`, no non-null assertions, exhaustive switches.

See `docs/` for architecture, database, auth, infrastructure, security, and the
Architecture Decision Records under `docs/adr/`.
