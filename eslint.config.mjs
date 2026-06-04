import { config } from '@workspace/eslint-config/base'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Root ESLint config — lints only repo-root files (commitlint.config.ts,
 * scripts/**, *.config.*). Each app/package owns its own eslint.config and is
 * linted via `turbo run lint`, so they are ignored here.
 */
export default defineConfig(
  globalIgnores([
    'apps/**',
    'packages/**',
    'tests/**',
    '.claude/**',
    '**/node_modules/**',
  ]),
  ...config,
  // Repo scripts may log to the console.
  { files: ['scripts/**/*.ts'], rules: { 'no-console': 'off' } }
)
