import path from 'node:path'

import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin({
  // Generates a .d.ts so ICU message ARGUMENTS are type-checked too.
  experimental: { createMessagesDeclaration: './messages/fr.json' },
})

// Baseline (per-response) security headers. The Content-Security-Policy is set
// per-request in proxy.ts because it carries a rotating nonce (see lib/csp.ts).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Emit a self-contained server bundle (apps/web/.next/standalone) so the
  // production Docker image stays small. See infra/docker/web.Dockerfile.
  output: 'standalone',
  // Workspace packages are shipped as raw TS and transpiled by Next.
  transpilePackages: [
    '@workspace/ui',
    '@workspace/core',
    '@workspace/db',
    '@workspace/auth',
  ],
  // Pin the monorepo root (silences the multi-lockfile inference warning).
  turbopack: { root: path.join(import.meta.dirname, '..', '..') },
  // Keep these Node-only libs out of the bundle: pino's lazy transport/worker
  // requires and pg-boss's dynamic SQL loading confuse bundlers. Resolved from
  // node_modules at runtime instead.
  serverExternalPackages: ['pino', 'pg-boss', '@node-rs/argon2'],
  // Opt-in: Next 16 Cache Components (PPR + `use cache`). Requires wrapping
  // dynamic (cookies/headers/searchParams) reads in <Suspense>. See README.
  // cacheComponents: true,
  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }])
  },
}

const config = withNextIntl(nextConfig)

// Sentry build plugin (source maps, tunnel route, tree-shaking) — only applied
// when SENTRY_DSN is set, so the default build is plugin-free. Runtime error
// reporting is configured separately in the sentry.*.config files.
export default process.env['SENTRY_DSN']
  ? withSentryConfig(config, {
      ...(process.env['SENTRY_ORG'] ? { org: process.env['SENTRY_ORG'] } : {}),
      ...(process.env['SENTRY_PROJECT']
        ? { project: process.env['SENTRY_PROJECT'] }
        : {}),
      ...(process.env['SENTRY_AUTH_TOKEN']
        ? { authToken: process.env['SENTRY_AUTH_TOKEN'] }
        : {}),
      // Route Sentry requests through the app to dodge ad-blockers.
      tunnelRoute: '/monitoring',
      // Upload source maps only when a token is available (CI release step).
      sourcemaps: { disable: !process.env['SENTRY_AUTH_TOKEN'] },
      silent: !process.env['CI'],
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : config
