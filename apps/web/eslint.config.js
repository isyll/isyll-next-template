import { nextJsConfig } from '@workspace/eslint-config/next-js'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig(
  // e2e specs are type-checked and run by Playwright's own toolchain.
  globalIgnores(['e2e/**']),
  ...nextJsConfig,
  // Point the Next plugin at this app's root so its routes-dir rules resolve
  // even when ESLint runs from the monorepo root (e.g. lint-staged / pre-commit),
  // not just via `turbo run lint` (which runs in this package's cwd).
  { settings: { next: { rootDir: import.meta.dirname } } }
)
