import 'server-only'

import * as Sentry from '@sentry/nextjs'

import { env } from '@/env'

/**
 * Server-side Sentry helpers, gated on `SENTRY_DSN`. Everything is a no-op when
 * Sentry is disabled, so call sites never need to branch. The runtime SDK init
 * lives in `sentry.server.config.ts` / `sentry.edge.config.ts`.
 */
export function sentryEnabled(): boolean {
  return Boolean(env.SENTRY_DSN)
}

/** Report a (non-operational) error to Sentry with optional structured context. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!sentryEnabled()) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

/**
 * Record a security-relevant signal (rate-limit hit, suspicious access, …) as a
 * Sentry message tagged `security`, so these surface even though they are
 * "expected" operational errors that aren't reported as exceptions.
 */
export function captureSecurityEvent(
  message: string,
  data?: {
    level?: 'warning' | 'error'
    tags?: Record<string, string>
    extra?: Record<string, unknown>
  }
): void {
  if (!sentryEnabled()) return
  Sentry.captureMessage(message, {
    level: data?.level ?? 'warning',
    tags: { category: 'security', ...data?.tags },
    ...(data?.extra ? { extra: data.extra } : {}),
  })
}
