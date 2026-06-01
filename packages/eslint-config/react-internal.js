import pluginReact from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

import { config as baseConfig } from './base.js'

/**
 * ESLint config for an internal React 19 library (e.g. @workspace/ui).
 * No Next.js rules.
 */
export const config = defineConfig(
  ...baseConfig,
  // react.version pinned to a string ('19') — faster than auto-detection and
  // sidesteps the eslint-plugin-react getFilename crash on ESLint 10.
  { settings: { react: { version: '19' } } },
  pluginReact.configs.flat.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  }
)
