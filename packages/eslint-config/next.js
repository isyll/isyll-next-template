import pluginNext from '@next/eslint-plugin-next'
import pluginQuery from '@tanstack/eslint-plugin-query'
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
  }
)
