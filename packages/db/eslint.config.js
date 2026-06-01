import { config } from '@workspace/eslint-config/base'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  // Standalone scripts are allowed to log progress to the console.
  {
    files: ['src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]
