# 0001 — Record architecture decisions

- **Status:** Accepted (2026-06-04)

## Context

This codebase is edited heavily by AI agents.
Decisions that look arbitrary in the code (why soft-delete everywhere? why a
nonce CSP that forces dynamic rendering?) get re-litigated or silently undone
when the rationale isn't written down.

## Decision

Keep lightweight ADRs under `docs/adr/`, one per significant, hard-to-reverse
decision, in Status/Context/Decision/Consequences form. Add an ADR when a change
constrains future work or would surprise a newcomer. Supersede rather than
rewrite.

## Consequences

- Agents and humans have a durable "why" to read before changing the foundation.
- A small, ongoing authoring cost — paid only for decisions that matter.
