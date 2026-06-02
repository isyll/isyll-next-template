---
description: Initialize this template for a new project (name, brief, env, cleanup)
---

You are bootstrapping a NEW project from this template. Do the following:

1. Ask me (concisely, batched) for: project name (kebab-case), display name,
   one-line description, the GitHub owner/org, and which social auth providers
   to keep. Skip if I already provided them: $ARGUMENTS

2. Run `pnpm project:init` passing the answers as flags (see
   `scripts/init-project.ts --help`). This updates the root package name, the
   GitHub owner references, `messages/fr.json` (appName + Metadata), BetterAuth
   appName/cookiePrefix, the README title, creates `.env` from `.env.example`,
   and writes/updates `PROJECT.md` with the brief.

3. Update `PROJECT.md` with the project's purpose, domain entities, and goals
   so future agents understand the context.

4. Run `pnpm install` then `pnpm check`. Fix anything that breaks.

5. Create a single Conventional Commit (e.g. `chore(repo): initialize <name>`)
   with NO `Co-Authored-By` trailer.

Be decisive; use sensible defaults and tell me what you chose.
