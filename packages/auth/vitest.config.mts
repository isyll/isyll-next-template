import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Workspace deps (@workspace/core) are shipped as raw TS, so inline them
    // for transformation instead of treating them as pre-built externals.
    server: { deps: { inline: [/@workspace\//] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.config.*', 'src/index.ts'],
    },
  },
})
