# Security

Security defaults and the knobs you'll most likely turn — defense in depth, a
strict nonce-based CSP, and a CI supply-chain gate that all degrade safely in
dev. The vulnerability-disclosure policy is in [`SECURITY.md`](../SECURITY.md).

## Overview

The threat model is a server-first, mostly-authenticated app. Three layers carry
most of the weight: two fully isolated auth systems (a compromised user secret
can't reach the operator console), per-request re-verification in every action
and DAL (`proxy.ts` is only an optimistic redirect), and a strict
Content-Security-Policy minted per request. Supply-chain risk is handled in CI
(gitleaks, CodeQL, dependency-review, `pnpm audit`).

## Two isolated auth systems

End users and operators are entirely separate: own BetterAuth instance, secret,
cookies, database role, and schema (`@workspace/auth` vs `@workspace/auth/admin`,
`@workspace/db` vs `@workspace/db/admin`). Operators are provisioned (no
self-signup) and gated by PBAC behind the baseline `console.access` permission.
Never mix the two. Passwords are hashed with **Argon2id** (memory-hard,
OWASP-balanced params; `packages/auth/src/password.ts`), not the default scrypt.
See [`docs/auth.md`](./auth.md).

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
See [ADR-0003](./adr/0003-strict-nonce-csp.md).

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as "proxy.ts (edge)"
    participant L as "Server layout / components"
    participant C as "/api/csp-report"
    P->>P: Mint per-request nonce
    P->>L: Forward request with x-nonce header + CSP
    L-->>B: HTML; Next nonces its own scripts via x-nonce
    P-->>B: Response CSP (enforced, or -Report-Only if CSP_REPORT_ONLY)
    B->>C: POST violation report (when CSP_REPORT_URI points here)
    C->>C: Log structured (scope: 'csp'); returns 204
```

> **Trade-off:** a nonce-based CSP opts pages into **dynamic rendering** (the
> nonce changes every request). That's the right default for a server-first,
> mostly-authenticated app. If a project needs statically-cached pages, relax
> the policy in `lib/csp.ts` (e.g. hash-based or `Content-Security-Policy-Report-Only`)
> and stop reading the nonce in the layout. Allow third-party origins
> (analytics, Stripe, an error tracker) by extending the relevant directive.

**Staged rollout.** Before enforcing a tightened policy, set `CSP_REPORT_ONLY=true`
to emit it as `Content-Security-Policy-Report-Only` — the browser logs violations
but blocks nothing — and point `CSP_REPORT_URI` at a collector. The repo ships a
real collector at `/api/csp-report` (`apps/web/app/api/csp-report/route.ts`):
point `CSP_REPORT_URI=/api/csp-report` and it logs each violation structured
(`scope: 'csp'`). When the reports are clean, unset `CSP_REPORT_ONLY` to enforce.
Both env vars are wired through `proxy.ts` / `lib/csp.ts` and default off.

## Rate limiting

`@/lib/rate-limit` provides app-level limits for Server Actions (separate from
BetterAuth's own endpoint limiter). It uses Redis (ioredis) when `REDIS_URL` is
set — a sliding-window algorithm over a sorted set — and an in-process fallback
otherwise. **Configure `REDIS_URL` in production** so limits are shared across
instances. `rateLimitedActionClient` applies a per-user limit; build dedicated
limiters for hot paths (login, password reset, expensive endpoints). Exceeded
limits are surfaced to Sentry as `security`-tagged events
([`docs/observability.md`](./observability.md)).

## Secrets and supply chain

- Secrets live in `.env` (gitignored). `.env.example` documents every key.
  `gitleaks` scans the full history in CI; `.gitleaks.toml` allowlists only the
  intentional placeholders.
- `CodeQL` runs SAST on every PR; `dependency-review` blocks new high-severity
  advisories; Dependabot keeps dependencies current.
- `pnpm audit` runs in CI (the `Security` workflow) and **fails the build on
  high/critical** advisories; moderate/low are reported but non-blocking. Run
  `pnpm audit` locally before pushing. Triage unavoidable false positives by
  adding the advisory id (with a justifying comment) to
  `auditConfig.ignoreCves` in **`pnpm-workspace.yaml`** — never by lowering the
  gate.
- **Minimum release age (opt-in, not active).** `pnpm-workspace.yaml` documents
  a `minimumReleaseAge` knob to quarantine newly-published versions, narrowing
  the window for a compromised release. It is left **unset** because enabling it
  would reject the committed lockfile (versions too new); the
  `minimumReleaseAgeExclude` list pre-allows packages that would otherwise be
  too new when you turn it on (e.g. `minimumReleaseAge: 10080` for 7 days).
- The `development` CI pipeline also runs `format:check` and `lint:md`
  (`.github/workflows/ci.yml`), so formatting and Markdown lint are gated too.
- **Sign your commits.** Make authorship verifiable:
  `git config commit.gpgsign true` with a GPG or SSH key (`git config gpg.format
ssh` for SSH), add the public key to GitHub, then enable a branch-protection
  rule requiring signed commits on `development` / `production`.

## Key files

| Concern              | Path                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| Edge proxy / nonce   | `@/proxy` ([`apps/web/proxy.ts`](../apps/web/proxy.ts))                            |
| CSP builder          | `@/lib/csp` ([`apps/web/lib/csp.ts`](../apps/web/lib/csp.ts))                      |
| CSP report collector | [`apps/web/app/api/csp-report/route.ts`](../apps/web/app/api/csp-report/route.ts)  |
| Static headers       | [`apps/web/next.config.ts`](../apps/web/next.config.ts)                            |
| Rate limiting        | `@/lib/rate-limit` ([`apps/web/lib/rate-limit.ts`](../apps/web/lib/rate-limit.ts)) |
| Password hashing     | [`packages/auth/src/password.ts`](../packages/auth/src/password.ts)                |
| Audit triage         | [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)                                    |
| Security CI          | [`.github/workflows/security.yml`](../.github/workflows/security.yml)              |

## Configuration

| Variable          | Required | Default | Purpose                                                              |
| ----------------- | -------- | ------- | -------------------------------------------------------------------- |
| `CSP_REPORT_ONLY` | No       | off     | Emit CSP as `Content-Security-Policy-Report-Only` (vet, don't block) |
| `CSP_REPORT_URI`  | No       | —       | Where the browser POSTs violations (e.g. `/api/csp-report`)          |
| `REDIS_URL`       | prod     | —       | Shared sliding-window rate limiting (in-process fallback otherwise)  |

## Related docs

- [Authentication & authorization](./auth.md)
- [Observability](./observability.md)
- [Architecture](./architecture.md)
- [ADR-0003 — Strict nonce CSP, accepting dynamic rendering](./adr/0003-strict-nonce-csp.md)
