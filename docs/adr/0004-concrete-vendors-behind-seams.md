# 0004 — Concrete vendors behind env-gated seams

- **Status:** Accepted (2026-06-04)

## Context

The project needs cross-cutting infrastructure (logging, error reporting, rate
limiting, email, background jobs, object storage) that most projects want. Two
failure modes to avoid: (a) empty abstractions that every project must wire up
before anything works, and (b) hard-wired vendors that are painful to swap or
that break `pnpm check` / local dev when no account is configured.

## Decision

Ship **concrete** vendors, each behind a thin seam and **gated on env** so it
degrades safely when not configured:

- Logging: pino (`@/lib/logger`); errors funnel through `reportError`
  (`@/lib/observability`) — the one place to add Sentry et al.
- Rate limiting & session storage: Redis via ioredis (`REDIS_URL`), with an
  in-process / database fallback (`@/lib/rate-limit`, `@/lib/redis`). Supersedes
  the original Upstash REST choice — a protocol-level client you can self-host
  suits the Docker/Nginx deploy target better.
- Email: Resend + React Email, console fallback in dev (`@workspace/email`).
- Jobs: pg-boss, reusing Postgres (`@/lib/jobs`).
- Storage: AWS SDK (S3/R2/MinIO), presigned URLs (`@/lib/storage`).

Node-only libs (pino, pg-boss) are kept bundle-external; the AWS SDK is gated on
`S3_*`. Heavy/build-coupled or highly project-specific integrations (e.g.
Sentry's build plugin under Turbopack) are documented one-step opt-ins rather
than baked in.

## Consequences

- Runs and builds with zero vendor accounts; production wiring is
  setting env vars.
- Swapping a provider is re-implementing one small module, not a refactor.
- Pure logic (rate-limiter, upload validation) is unit-tested; vendor I/O is
  exercised in integration/CI, not in `pnpm check`.
