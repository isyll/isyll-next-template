# Next Monorepo Template

> The base project. Replaced per-project by `pnpm project:init`.

## Overview

This is the **template itself**, not a specific product. When you start a new
project from it, run `pnpm project:init` (or the `/start-project` command) to
rewrite this file with the new project's purpose, domain model, and goals so
that AI agents have accurate context.

## Domain model

Out of the box there are only the authentication entities (see `@workspace/db`),
split across three schema-qualified Postgres schemas: global reference data in
`public` (currencies/countries/timezones), end users in `app`
(`users`/`sessions`/`accounts`/`verifications`, plus `audit_logs`), and a fully
isolated administrator set in `admin` (`operators`/`roles`/`permissions`/…).
Table names are plural. Add your real domain tables as pure-SQL migrations under
`packages/db/migrations/`.

## Constraints & decisions

- Server-first: Server Components + Server Actions; avoid API routes.
- French-only i18n for now (next-intl, cookie-based, no `[locale]` segment).
- PostgreSQL via pure-SQL migrations; Drizzle ORM for typed queries.
- Two isolated auth systems: end users and admins never share tables, roles,
  cookies, or BetterAuth instances.

---

Built on next-monorepo-template. See `AGENTS.md` for engineering conventions.
