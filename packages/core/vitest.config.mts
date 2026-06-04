import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Barrel file only re-exports; nothing to cover.
      exclude: ['**/*.config.*', 'src/index.ts'],
      // @workspace/core is foundational and won't change per-project — hold it
      // to a high bar so regressions surface immediately. The `test` script
      // runs with --coverage, so these thresholds gate every CI run.
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
})
