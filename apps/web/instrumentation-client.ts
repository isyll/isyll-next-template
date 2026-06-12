import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'

/**
 * Browser-side Sentry init. Inert unless `NEXT_PUBLIC_SENTRY_DSN` is set, so the
 * SDK adds no reporting (and minimal weight) when disabled.
 *
 * Session Replay is intentionally NOT enabled by default (bundle size +
 * privacy). To turn it on, add `Sentry.replayIntegration({ maskAllText: true,
 * blockAllMedia: true })` to `integrations` and set a `replaysOnErrorSampleRate`.
 */
if (env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    // Match the server/edge default: full sampling in dev, 10% in prod. The
    // server side is additionally tunable via SENTRY_TRACES_SAMPLE_RATE.
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
  })
}

// Instruments client-side navigations as spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
