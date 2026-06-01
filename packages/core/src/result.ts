/**
 * A typed, exception-free `Result` for business logic. Prefer returning a
 * `Result` from service-layer functions over throwing, so callers must handle
 * both outcomes at compile time. Throwing is reserved for truly exceptional /
 * programmer-error paths.
 */
import type { AppError } from './errors'

export interface Ok<out T> {
  readonly ok: true
  readonly value: T
}

export interface Err<out E> {
  readonly ok: false
  readonly error: E
}

export type Result<T, E = AppError> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

export function map<T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return result.ok ? result : err(fn(result.error))
}

export function andThen<T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}

export function match<T, E, A, B>(
  result: Result<T, E>,
  handlers: { readonly ok: (value: T) => A; readonly err: (error: E) => B }
): A | B {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error)
}

/** Run a throwing function and capture the outcome as a `Result`. */
export function fromThrowable<T>(fn: () => T): Result<T, unknown> {
  try {
    return ok(fn())
  } catch (error) {
    return err(error)
  }
}

/** Await a promise and capture the outcome as a `Result`. */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, unknown>> {
  try {
    return ok(await promise)
  } catch (error) {
    return err(error)
  }
}
