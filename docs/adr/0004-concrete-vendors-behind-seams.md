# 0004 — Concrete vendors behind env-gated seams

- **Status:** Accepted (2026-06-04)

## Context

The template needs cross-cutting infrastructure (logging, error reporting, rate
limiting, email, background jobs, object storage) that most projects want. Two
failure modes to avoid: (a) empty abstractions that every project must wire up
before anything works, and (b) hard-wired vendors that are painful to swap or
that break `pnpm check` / local dev when no account is configured.

## Decision

Ship **concrete** vendors, each behind a thin seam and **gated on env** so it
degrades safely when not configured:

- Logging: pino (`@/lib/logger`); errors funnel through `reportError`
  (`@/lib/observability`) — the one place to add Sentry et al.
- Rate limiting: Upstash Redis with an in-process fallback (`@/lib/rate-limit`).
- Email: Resend, console fallback in dev (`@workspace/auth/email`).
- Jobs: pg-boss, reusing Postgres (`@/lib/jobs`).
- Storage: AWS SDK (S3/R2/MinIO), presigned URLs (`@/lib/storage`).

Node-only libs (pino, pg-boss) are kept bundle-external; the AWS SDK is gated on
`S3_*`. Heavy/build-coupled or highly project-specific integrations (e.g.
Sentry's build plugin under Turbopack) are documented one-step opt-ins rather
than baked in.

## Consequences

- The template runs and builds with zero vendor accounts; production wiring is
  setting env vars.
- Swapping a provider is re-implementing one small module, not a refactor.
- Pure logic (rate-limiter, upload validation) is unit-tested; vendor I/O is
  exercised in integration/CI, not in `pnpm check`.
