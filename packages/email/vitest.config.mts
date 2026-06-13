import { defineConfig } from 'vitest/config'

/**
 * Templates render to an HTML string server-side, so no DOM is needed (node
 * environment). Vitest's default transformer handles the automatic JSX runtime.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
