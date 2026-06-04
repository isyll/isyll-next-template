/**
 * Architecture-boundary rules for the monorepo, enforced in CI (`pnpm boundaries`).
 *
 * These encode the layering from AGENTS.md as hard, machine-checked rules so an
 * agent (or human) can't quietly break the architecture:
 *
 *   core  ← the framework-agnostic foundation, depends on nothing internal
 *   db    ← may use core only
 *   auth  ← may use core + db
 *   ui    ← presentational, must not pull in db/auth/core-server code
 *   web   ← the only place allowed to compose every package
 *
 * Workspace packages resolve through pnpm symlinks to their real `packages/<x>/src`
 * paths (preserveSymlinks defaults to false), so the path-based rules below match
 * regardless of whether a file imported `@workspace/db` or a relative path.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular dependencies make the module graph impossible to reason about, break ' +
        'tree-shaking, and cause hard-to-debug init-order bugs. Break the cycle.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-stays-pure',
      severity: 'error',
      comment:
        '@workspace/core is the foundation (Result, AppError, DTOs). It must not depend ' +
        'on any other workspace package or the app — keep it framework-agnostic.',
      from: { path: '^packages/core/' },
      to: { path: '^(packages/(db|auth|ui)|apps)/' },
    },
    {
      name: 'db-only-uses-core',
      severity: 'error',
      comment:
        '@workspace/db may only build on @workspace/core. It must never import auth, ui, ' +
        'or app code.',
      from: { path: '^packages/db/' },
      to: { path: '^(packages/(auth|ui)|apps)/' },
    },
    {
      name: 'ui-stays-presentational',
      severity: 'error',
      comment:
        '@workspace/ui is a presentational library. It must not import server/data ' +
        'packages (db, auth) or the app — keep client bundles lean and reusable.',
      from: { path: '^packages/ui/' },
      to: { path: '^(packages/(db|auth)|apps)/' },
    },
    {
      name: 'auth-no-ui-or-app',
      severity: 'error',
      comment:
        '@workspace/auth may use core + db, but never the ui package or app code.',
      from: { path: '^packages/auth/' },
      to: { path: '^(packages/ui|apps)/' },
    },
    {
      name: 'packages-never-import-app',
      severity: 'error',
      comment:
        'Workspace packages are reusable libraries. They must never depend on apps/* — ' +
        'that inverts the dependency direction and couples shared code to one app.',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
  ],
  options: {
    doNotFollow: { path: '(^|/)node_modules/' },
    exclude: {
      path: [
        '(^|/)node_modules/',
        '(^|/)(\\.next|dist|coverage|\\.turbo)/',
        '\\.(test|spec)\\.[tj]sx?$',
        '(^|/)(test|e2e|__tests__)/',
        '(^|/)tests/load/',
      ].join('|'),
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'types', 'default'],
      extensions: [
        '.ts',
        '.tsx',
        '.mts',
        '.cts',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.json',
      ],
      mainFields: ['module', 'main', 'types'],
    },
  },
}
