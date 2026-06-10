import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'

/**
 * Next.js instrumentation hook. Loads the matching Sentry runtime config (inert
 * unless `SENTRY_DSN` is set). On the Node runtime, when Sentry is off and
 * `OTEL_EXPORTER_OTLP_ENDPOINT` is set, it registers the OTLP tracer provider
 * instead — Sentry owns the single provider when both are configured.
 */
export async function register(): Promise<void> {
  if (env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    if (!env.SENTRY_DSN && env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      const { startTracing } =
        await import('./server/observability/otel-bootstrap')
      startTracing()
    }
  }
  if (env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures errors thrown in Server Components / route handlers / Server Actions.
export const onRequestError = Sentry.captureRequestError
