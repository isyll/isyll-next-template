# CLAUDE.md

Project instructions for Claude Code. The full agent guide is shared with all
agents in **@AGENTS.md** — read it first.

## Claude-specific

- After completing a task, create a Conventional Commit. **Never** add a
  `Co-Authored-By` trailer or any AI attribution.
- Run `pnpm check` before declaring work done.
- To set up this project (name, env, brief), use the `/start-project` slash
  command (runs `pnpm project:init`). To scaffold a feature, use `/new-feature`.
- The current project's purpose/scope is in `PROJECT.md` — read it for context.
- Prefer Server Components + Server Actions; keep `'use client'` at the leaves.
- Reuse the built **Platform services** (logging/`reportError`, rate limiting,
  email, jobs, storage, notifications) — see AGENTS.md; don't reinvent them.
- A PreToolUse hook (`.claude/hooks/guard.mjs`) blocks raw `process.env` in
  app code and `'use client'` in data-access files. Respect it; don't bypass.
