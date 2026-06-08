# Security

How this template defends itself, and the knobs you'll most likely turn.
The vulnerability-disclosure policy is in [`SECURITY.md`](../SECURITY.md).

## Two isolated auth systems

End users and operators are entirely separate: own BetterAuth instance, secret,
cookies, database role, and schema (`@workspace/auth` vs `@workspace/auth/admin`,
`@workspace/db` vs `@workspace/db/admin`). A compromised user secret can never
grant operator access. Operators are provisioned (no self-signup) and gated by
PBAC. Never mix the two. Passwords are hashed with **Argon2id** (memory-hard,
OWASP-balanced params; `packages/auth/src/password.ts`), not the default scrypt.

## Defense in depth

`proxy.ts` is an **optimistic** redirect only — never a security boundary. Every
Server Action and DAL re-verifies authentication **and** ownership, validates
input with Zod, and returns DTOs (never raw rows). The migration DB role is
distinct from the runtime app/admin roles (least privilege), and reference data
is immutable at the database level.

## HTTP headers and CSP

Static headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`.

The **Content-Security-Policy** is set per-request in `proxy.ts` with a rotating
nonce (`lib/csp.ts`): production uses `'nonce-…' 'strict-dynamic'` with **no**
`'unsafe-inline'` in `script-src`; development relaxes it for Turbopack HMR.

> **Trade-off:** a nonce-based CSP opts pages into **dynamic rendering** (the
> nonce changes every request). That's the right default for a server-first,
> mostly-authenticated app. If a project needs statically-cached pages, relax
> the policy in `lib/csp.ts` (e.g. hash-based or `Content-Security-Policy-Report-Only`)
> and stop reading the nonce in the layout. Allow third-party origins
> (analytics, Stripe, an error tracker) by extending the relevant directive.

## Rate limiting

`@/lib/rate-limit` provides app-level limits for Server Actions (separate from
BetterAuth's own endpoint limiter). It uses Redis (ioredis) when `REDIS_URL` is
set — a sliding-window algorithm over a sorted set — and an in-process fallback
otherwise. **Configure `REDIS_URL` in production** so limits are shared across
instances.
`rateLimitedActionClient` applies a per-user limit; build dedicated limiters for
hot paths (login, password reset, expensive endpoints). Exceeded limits are
surfaced to Sentry as `security`-tagged events (`docs/observability.md`).

## Secrets and supply chain

- Secrets live in `.env` (gitignored). `.env.example` documents every key.
  `gitleaks` scans the full history in CI; `.gitleaks.toml` allowlists only the
  intentional placeholders.
- `CodeQL` runs SAST on every PR; `dependency-review` blocks new high-severity
  advisories; Dependabot keeps dependencies current. New, very-recent packages
  are quarantined by a minimum-release-age policy until explicitly allowed.
