import { config } from '@workspace/eslint-config/base'

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Test-only shims that live outside the tsconfig project (the type-aware
  // parser would reject them) and need no linting.
  { ignores: ['vitest-stubs/**'] },
  ...config,
  // Standalone scripts are allowed to log progress to the console.
  {
    files: ['src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]
