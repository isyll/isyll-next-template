/**
 * Application error hierarchy.
 *
 * Every domain/business error extends {@link AppError} and carries a stable
 * `code` and an `httpStatus`. This lets the transport layer (server actions,
 * route handlers) map a thrown error to a safe, user-facing message without
 * leaking internals.
 */

export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL'

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode
  abstract readonly httpStatus: number
  /** Whether the message is safe to surface to end users as-is. */
  readonly isOperational: boolean = true

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }

  toJSON(): { name: string; code: ErrorCode; message: string } {
    return { name: this.name, code: this.code, message: this.message }
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION'
  readonly httpStatus = 400
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>

  constructor(
    message = 'Validation failed',
    options?: ErrorOptions & {
      fieldErrors?: Readonly<Record<string, readonly string[]>>
    }
  ) {
    super(message, options)
    this.fieldErrors = options?.fieldErrors ?? {}
  }
}

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED'
  readonly httpStatus = 401
  constructor(message = 'Authentication required', options?: ErrorOptions) {
    super(message, options)
  }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN'
  readonly httpStatus = 403
  constructor(message = 'Access denied', options?: ErrorOptions) {
    super(message, options)
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND'
  readonly httpStatus = 404
  constructor(message = 'Resource not found', options?: ErrorOptions) {
    super(message, options)
  }
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT'
  readonly httpStatus = 409
  constructor(message = 'Resource conflict', options?: ErrorOptions) {
    super(message, options)
  }
}

export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMITED'
  readonly httpStatus = 429
  constructor(message = 'Too many requests', options?: ErrorOptions) {
    super(message, options)
  }
}

/** Non-operational: internal failure, message must NOT be surfaced verbatim. */
export class InternalError extends AppError {
  readonly code = 'INTERNAL'
  readonly httpStatus = 500
  override readonly isOperational = false
  constructor(message = 'Something went wrong', options?: ErrorOptions) {
    super(message, options)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/** Coerce any thrown value into a typed {@link AppError}. */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error
  if (error instanceof Error) {
    return new InternalError(error.message, { cause: error })
  }
  return new InternalError('Unknown error', { cause: error })
}
