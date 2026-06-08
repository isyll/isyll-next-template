# Database

PostgreSQL accessed through Drizzle ORM for typed queries, with schema changes
applied as hand-written pure-SQL migrations.

## Migrations

Migrations live in `packages/db/migrations/` as paired files named
`NNNNNN_description.up.sql` / `.down.sql`, applied by a small Node runner
(`packages/db/src/scripts/migrate.ts`, built on `pg` — no external binary).
State is tracked in `public.schema_migrations` and each step runs in its own
transaction; add `-- migrate:no-transaction` as the first line for statements
that cannot (e.g. `CREATE INDEX CONCURRENTLY`). One table (and all of its
indexes, constraints, triggers, and grants) per migration.

| Command                      | Action                                  |
| ---------------------------- | --------------------------------------- |
| `pnpm db:migrate:new <name>` | Scaffold the next numbered up/down pair |
| `pnpm db:migrate`            | Apply all pending migrations            |
| `pnpm db:rollback`           | Roll back the most recent migration     |
| `pnpm db:migrate:status`     | Show the current version                |
| `pnpm sql:lint` / `sql:fix`  | SQLFluff lint / autofix                 |

Adding a table:

1. `pnpm db:migrate:new create_widgets` and write the `up`/`down` SQL (FKs,
   indexes, an `updated_at` trigger via `set_updated_at()`, and role grants).
2. Mirror the table in `packages/db/src/schema` so queries stay typed.
3. `pnpm db:migrate`.

## Reference data

`currencies` (ISO 4217), `countries` (ISO 3166), and `timezones` (canonical
IANA, linked to their country) are generated from maintained npm packages into
migrations `000003`–`000005` and made **immutable** at the database level
(a `prevent_row_mutation()` trigger + read-only grants). Regenerate with
`pnpm db:reference:generate`. `supported_countries` is the mutable opt-in
availability table — empty means "available everywhere".

## Roles (least privilege)

`infra/postgres/initdb/00-roles.sh` provisions three login roles, each used by a
different concern:

| Role            | Connection string        | Rights                             |
| --------------- | ------------------------ | ---------------------------------- |
| `app_migrator`  | `MIGRATION_DATABASE_URL` | Owns DDL; runs migrations          |
| `app`           | `DATABASE_URL`           | DML on the public user tables      |
| `admin_service` | `ADMIN_DATABASE_URL`     | DML on the isolated `admin` schema |

In single-role development every URL can point at one superuser; the migration
grants are guarded so they no-op when a role is absent.

## Shared objects

Migration `000002` creates the `set_updated_at()` trigger function, the
`prevent_row_mutation()` guard, and the `email_address` domain (validated,
case-insensitive `citext`) reused by every account table.
