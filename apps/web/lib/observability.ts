import 'server-only'

import { type AppError, normalizeError } from '@workspace/core'

import { logger } from '@/lib/logger'
import { captureException } from '@/lib/sentry'

export type ErrorContext = Record<string, unknown>

/**
 * The single choke-point for server-side error reporting. It normalizes any
 * thrown value into an {@link AppError}, logs it (structured, with context),
 * forwards genuine (non-operational) failures to Sentry, and returns the
 * normalized error so callers can decide what to surface.
 *
 * Operational errors (validation, auth, rate-limit) are expected — they are
 * logged at `warn` and NOT sent to Sentry, to avoid drowning real bugs.
 * Sentry is wired through `@/lib/sentry` and is a no-op unless `SENTRY_DSN` is
 * set, so this works the same with or without it configured.
 */
export function reportError(error: unknown, context?: ErrorContext): AppError {
  const normalized = normalizeError(error)
  const level = normalized.isOperational ? 'warn' : 'error'
  logger[level](
    { err: normalized, code: normalized.code, ...context },
    normalized.message
  )
  if (!normalized.isOperational) {
    captureException(error, { code: normalized.code, ...context })
  }
  return normalized
}
