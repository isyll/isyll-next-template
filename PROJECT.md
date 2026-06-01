# Isyll Next Template

> The base project. Replaced per-project by `pnpm project:init`.

## Overview

This is the **template itself**, not a specific product. When you start a new
project from it, run `pnpm project:init` (or the `/start-project` command) to
rewrite this file with the new project's purpose, domain model, and goals so
that AI agents have accurate context.

## Domain model

The example domain is a single `post` entity owned by an authenticated `user`
(see `@workspace/db`). Replace it with your real entities.

## Constraints & decisions

- Server-first: Server Components + Server Actions; avoid API routes.
- French-only i18n for now (next-intl, cookie-based, no `[locale]` segment).
- PostgreSQL via Drizzle; BetterAuth for authentication.

---

Built on the isyll-next-template. See `AGENTS.md` for engineering conventions.
