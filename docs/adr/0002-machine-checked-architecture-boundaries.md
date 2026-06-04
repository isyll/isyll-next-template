# 0002 — Machine-checked module boundaries

- **Status:** Accepted (2026-06-04)

## Context

The monorepo has an intended layering (`core` → `db` → `auth` → app; `ui` is
presentational). Documentation alone doesn't hold: an agent under time pressure
will import `@workspace/db` into `core`, or reach across packages, and nothing
stops it until something breaks far away.

## Decision

Encode the layering as hard rules in `.dependency-cruiser.cjs`, run as
`pnpm boundaries` in `pnpm check` and the CI quality matrix:

- `core` depends on nothing internal; `db` → core only; `ui` imports no
  server/data packages; `auth` → core + db; packages never import `apps/*`;
  no circular dependencies.

Pair it with ESLint rules (no raw `process.env` in the app, no non-null
assertions, exhaustive switches) and a Claude Code edit-guard hook for instant
feedback.

## Consequences

- Architecture violations fail fast, in CI, with a clear message — not in review.
- New cross-package dependencies require a deliberate rule change (a feature).
- `server-only` import boundaries remain enforced by Next at build time, not by
  the cruiser.
