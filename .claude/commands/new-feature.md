---
description: Scaffold a server-first feature module following the conventions
---

Scaffold a new feature module named from: $ARGUMENTS

Follow the `post` feature as the reference pattern. Create under
`apps/web/src/features/<feature>/`:

- `queries.ts` — `import 'server-only'` Data Access Layer using `@workspace/db`
  (Drizzle), with ownership checks. Return DTO/row types, never raw clients.
- `actions.ts` — `'use server'` actions via `authActionClient` from
  `@/lib/safe-action`; validate input with Zod (async `inputSchema` factory +
  `getTranslations('Validation')` for localized messages); `revalidatePath`.
- `components/` — RSC list/detail (server) + `'use client'` forms using
  `useAction` (next-safe-action) and `@workspace/ui` components.

Also:

- Add the table to `@workspace/db` (`src/schema`), relations, and drizzle-zod
  validators; run `pnpm db:generate` and commit the migration.
- Add all user-facing strings to `messages/fr.json` (new namespace).
- Wire the feature into a route under `apps/web/src/app/`.
- Run `pnpm check`, then commit: `feat(web): add <feature> feature`.
