import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'

/**
 * Edge-runtime Sentry init (the `proxy.ts` middleware runs here). Loaded by
 * `instrumentation.ts`. Inert unless `SENTRY_DSN` is set — see the server config.
 */
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate:
      env.SENTRY_TRACES_SAMPLE_RATE ??
      (env.NODE_ENV === 'production' ? 0.1 : 1),
    sendDefaultPii: false,
  })
}
