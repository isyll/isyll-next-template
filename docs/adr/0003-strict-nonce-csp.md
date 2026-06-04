# 0003 — Strict nonce CSP, accepting dynamic rendering

- **Status:** Accepted (2026-06-04)

## Context

A strict Content-Security-Policy is the single highest-leverage XSS defense, but
Next.js injects inline bootstrap scripts (and next-themes an inline anti-flash
script). Allowing them needs either `'unsafe-inline'` (weak) or a per-request
nonce. A nonce changes every request, which opts pages into **dynamic
rendering** — losing full static caching.

## Decision

Emit a per-request nonce + strict CSP (`'nonce-…' 'strict-dynamic'`, no
`'unsafe-inline'` in `script-src`) from `proxy.ts` (`lib/csp.ts`), forwarded via
`x-nonce` so Next and next-themes pick it up. Development relaxes the policy for
Turbopack HMR. Security is the default; the static-rendering cost is accepted
for this server-first, mostly-authenticated template.

## Consequences

- Strong XSS protection out of the box; the policy builder is unit-tested.
- Pages render dynamically. Projects with heavy static marketing pages can relax
  `lib/csp.ts` (report-only / hash-based) and stop reading the nonce — see
  `docs/security.md`.
- Third-party origins (analytics, payments, error trackers) must be explicitly
  allowlisted in the relevant directive.
