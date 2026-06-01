/** @type {import('lint-staged').Configuration} */
export default {
  '*.{js,jsx,ts,tsx,mjs,cjs}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write',
  ],
  '*.{json,md,mdx,css,yml,yaml}': ['prettier --write'],
  // tsc is project-wide — run via turbo (don't append staged file paths).
  '*.{ts,tsx}': () => 'turbo run typecheck',
}
