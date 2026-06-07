import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'

/**
 * Next.js instrumentation hook. Loads the matching Sentry runtime config
 * (`sentry.server.config` for Node, `sentry.edge.config` for the proxy). Both
 * are inert unless `SENTRY_DSN` is set.
 */
export async function register(): Promise<void> {
  if (env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures errors thrown in Server Components / route handlers / Server Actions.
export const onRequestError = Sentry.captureRequestError
