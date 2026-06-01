import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import turboPlugin from 'eslint-plugin-turbo'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Shared, strict, type-aware ESLint base config for the monorepo.
 *
 * Type-aware linting uses `projectService: true`, which resolves each file's
 * tsconfig relative to the working directory. Turborepo runs every package's
 * `lint` script from that package's own directory, so no `tsconfigRootDir` is
 * needed here.
 */
export const config = defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/.source/**',
    '**/drizzle/**',
    '**/*.gen.ts',
    '**/next-env.d.ts',
  ]),
  js.configs.recommended,
  // strictTypeChecked supersedes recommended/strict and is the strictest preset.
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
  },
  {
    plugins: { turbo: turboPlugin },
    rules: { 'turbo/no-undeclared-env-vars': 'error' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Allow async handlers on JSX attributes (onClick={async () => ...}).
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  // Type-aware rules can't run on plain JS / standalone config files.
  {
    files: ['**/*.{js,cjs,mjs}', '**/*.config.{ts,mts,cts}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Must be LAST: turn off stylistic rules that conflict with Prettier.
  eslintConfigPrettier
)
