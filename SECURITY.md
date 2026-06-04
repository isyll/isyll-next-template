# Security Policy

> Update the contact address below when initializing a project from this
> template (`pnpm project:init`).

## Reporting a vulnerability

**Do not open a public issue for security problems.** Report them privately:

- Preferred: open a [GitHub private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  on this repository.
- Or email **security@example.com** with steps to reproduce, affected
  versions, and impact.

We aim to acknowledge reports within **2 business days** and to ship a fix or
mitigation for confirmed high/critical issues within **14 days**.

Please give us a reasonable window to remediate before any public disclosure.

## Scope

In scope: the application code in this repository (apps and packages), its CI
configuration, and its container/infrastructure definitions under `infra/`.

Out of scope: vulnerabilities in third-party dependencies that are already
publicly disclosed (these are tracked by Dependabot and the
`dependency-review` CI job), and findings that require a compromised developer
machine or stolen credentials.

## Hardening already in place

This template ships with several defensive defaults; keep them when building on
it (see `AGENTS.md` for the rationale):

- **Two fully isolated auth systems** — end users and operators have separate
  BetterAuth instances, secrets, cookies, database roles, and schemas. A
  compromised user secret can never grant operator access.
- **Least-privilege database roles** — the migration role is distinct from the
  runtime app/admin roles; reference data is immutable at the DB level.
- **Defense in depth** — every Server Action and DAL re-verifies authentication
  **and** ownership; `proxy.ts` checks are treated as optimistic only.
- **Validated input and output** — all input is parsed with Zod; only DTOs (not
  raw rows) leave the data layer.
- **Strict security headers and a per-request CSP nonce** (see `next.config.ts`
  and `proxy.ts`).

## Automated checks

| Check              | Tool                          | Where                            |
| ------------------ | ----------------------------- | -------------------------------- |
| SAST               | CodeQL (security-and-quality) | `.github/workflows/codeql.yml`   |
| Secret scanning    | gitleaks                      | `.github/workflows/security.yml` |
| Dependency review  | dependency-review-action      | `.github/workflows/security.yml` |
| Dependency updates | Dependabot                    | `.github/dependabot.yml`         |
