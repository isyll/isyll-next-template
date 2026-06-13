import pluginNext from '@next/eslint-plugin-next'
import pluginQuery from '@tanstack/eslint-plugin-query'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import pluginReact from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

import { config as baseConfig } from './base.js'

/**
 * ESLint config for a Next.js 16 App Router app (e.g. apps/web).
 *
 * Composes @next/eslint-plugin-next + eslint-plugin-react-hooks + the TanStack
 * Query rules directly instead of the eslint-config-next meta-config, which
 * pulls in ESLint-10-incompatible transitive plugins.
 */
export const nextJsConfig = defineConfig(
  ...baseConfig,
  { settings: { react: { version: '19' } } },
  pluginReact.configs.flat.recommended,
  reactHooks.configs.flat.recommended,
  // Accessibility lint (WCAG-aligned) on all JSX — labelled controls, valid
  // ARIA, keyboard handlers paired with mouse handlers, etc. Static companion
  // to the axe-core checks in the E2E suite.
  jsxA11y.flatConfigs.recommended,
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { '@next/next': pluginNext },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
      },
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  // App code must read configuration through the validated `@/env` module, never
  // `process.env` directly — that's the single place the server/client boundary
  // and the schema are enforced (see AGENTS.md, golden rule #4). The env module
  // itself and standalone config files are the only legitimate readers.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/env.ts', '**/*.config.{ts,mts,cts,js,mjs,cjs}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Import the validated `env` from `@/env` instead of reading `process.env` directly.',
        },
      ],
    },
  }
)
