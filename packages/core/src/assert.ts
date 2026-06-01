/** Assertion helpers for invariants and exhaustiveness checks. */
import { InternalError } from './errors'

/** Throw an {@link InternalError} if `condition` is falsy. Narrows the type. */
export function invariant(
  condition: unknown,
  message = 'Invariant violation'
): asserts condition {
  if (!condition) {
    throw new InternalError(message)
  }
}

/**
 * Exhaustiveness guard for discriminated unions. Reaching this at runtime means
 * a variant was added without being handled — caught at compile time by `never`.
 */
export function assertNever(
  value: never,
  message = 'Unhandled variant'
): never {
  throw new InternalError(`${message}: ${JSON.stringify(value)}`)
}
