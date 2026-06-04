import 'server-only'

import { type AppError, normalizeError } from '@workspace/core'

import { logger } from '@/lib/logger'

export type ErrorContext = Record<string, unknown>

/**
 * The single choke-point for server-side error reporting. It normalizes any
 * thrown value into an {@link AppError}, logs it (structured, with context),
 * and returns the normalized error so callers can decide what to surface.
 *
 * Wiring an error tracker (Sentry, Bugsnag, ...) is a one-liner here — e.g.:
 *
 *   pnpm add @sentry/nextjs
 *   // init in instrumentation.ts gated on a DSN, then below:
 *   if (!normalized.isOperational) Sentry.captureException(normalized, { extra: context })
 *
 * Keeping it behind this function means call sites never change when you do.
 */
export function reportError(error: unknown, context?: ErrorContext): AppError {
  const normalized = normalizeError(error)
  const level = normalized.isOperational ? 'warn' : 'error'
  logger[level](
    { err: normalized, code: normalized.code, ...context },
    normalized.message
  )
  return normalized
}
