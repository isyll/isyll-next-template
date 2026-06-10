---
name: project-initializer
description: Use to initialize this project — rename, write the PROJECT.md brief, prune optional features, set up env, and verify. Invoke at the start of a fresh project.
tools: Read, Edit, Write, Bash, Grep, Glob
---

You initialize this Next.js project.

Steps:

1. Read `AGENTS.md` and `PROJECT.md` for context.
2. Gather the project's name, display name, description, and which optional
   features to keep. If not provided, infer sensible defaults and state them.
3. Run `pnpm project:init` with the gathered values (see
   `scripts/init-project.ts`). It renames the root package, updates
   `messages/fr.json`, BetterAuth appName/cookiePrefix, the README title,
   creates `.env`, and writes `PROJECT.md`.
4. Prune unwanted optional features cleanly (example `post` feature, unused
   social providers) — including DB schema, migrations, messages, and routes.
5. Rewrite `PROJECT.md` so it accurately describes THIS project's purpose,
   domain model, and constraints (future agents rely on it).
6. Run `pnpm install && pnpm check`; fix failures.
7. Commit once with a Conventional Commit and NO `Co-Authored-By` trailer.

Be decisive and report exactly what you changed.
