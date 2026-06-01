---
description: Initialize this template for a new project (name, brief, env, cleanup)
---

You are bootstrapping a NEW project from this template. Do the following:

1. Ask me (concisely, batched) for: project name (kebab-case), display name,
   one-line description, and which optional features to keep (social auth
   providers, the example `post` feature). Skip if I already provided them: $ARGUMENTS

2. Run `pnpm project:init` passing the answers as flags (see
   `scripts/init-project.ts --help`). This updates the root package name,
   `messages/fr.json` (appName + Metadata), BetterAuth appName/cookiePrefix,
   the README title, creates `.env` from `.env.example`, and writes/updates
   `PROJECT.md` with the brief.

3. If I opted out of the example `post` feature, remove
   `apps/web/src/features/posts/`, its dashboard usage, the `post` table +
   relation in `@workspace/db`, and regenerate the migration.

4. Update `PROJECT.md` with the project's purpose, domain entities, and goals
   so future agents understand the context.

5. Run `pnpm install` then `pnpm check`. Fix anything that breaks.

6. Create a single Conventional Commit (e.g. `chore(repo): initialize <name>`)
   with NO `Co-Authored-By` trailer.

Be decisive; use sensible defaults and tell me what you chose.
