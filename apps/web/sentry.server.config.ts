import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'

/**
 * Server-side Sentry init (Node runtime). Loaded by `instrumentation.ts`.
 *
 * Disabled by default: with no `SENTRY_DSN` set, `init` is never called and the
 * SDK is inert — so any project that doesn't want Sentry
 * runs with zero reporting. Set `SENTRY_DSN` to enable.
 */
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    // Sample 10% of traces in prod, everything in dev. Tune per project.
    tracesSampleRate:
      env.SENTRY_TRACES_SAMPLE_RATE ??
      (env.NODE_ENV === 'production' ? 0.1 : 1),
    // Never auto-attach IPs / cookies / bodies — opt in deliberately instead.
    sendDefaultPii: false,
  })
}
