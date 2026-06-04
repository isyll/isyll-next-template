import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The DB client is `import 'server-only'`, which throws outside a server
      // bundle. Under the node test runner we stub it to a no-op so integration
      // tests can import the client.
      'server-only': fileURLToPath(
        new URL('./vitest-stubs/server-only.ts', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Workspace deps (@workspace/core) ship as raw TS — inline for transform.
    server: { deps: { inline: [/@workspace\//] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.config.*', 'src/index.ts', 'src/scripts/**'],
    },
  },
})
