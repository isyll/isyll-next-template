import { describe, expect, it } from 'vitest'

import {
  AppError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
  isAppError,
  normalizeError,
} from './errors'

describe('error hierarchy', () => {
  it('maps each error to a stable code + http status', () => {
    expect([
      [new ValidationError().code, new ValidationError().httpStatus],
      [new UnauthorizedError().code, new UnauthorizedError().httpStatus],
      [new ForbiddenError().code, new ForbiddenError().httpStatus],
      [new NotFoundError().code, new NotFoundError().httpStatus],
      [new ConflictError().code, new ConflictError().httpStatus],
      [new RateLimitError().code, new RateLimitError().httpStatus],
      [new InternalError().code, new InternalError().httpStatus],
    ]).toEqual([
      ['VALIDATION', 400],
      ['UNAUTHORIZED', 401],
      ['FORBIDDEN', 403],
      ['NOT_FOUND', 404],
      ['CONFLICT', 409],
      ['RATE_LIMITED', 429],
      ['INTERNAL', 500],
    ])
  })

  it('sets name to the concrete class and is an Error/AppError', () => {
    const err = new NotFoundError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.name).toBe('NotFoundError')
  })

  it('treats domain errors as operational but InternalError as not', () => {
    expect(new ValidationError().isOperational).toBe(true)
    expect(new ForbiddenError().isOperational).toBe(true)
    expect(new InternalError().isOperational).toBe(false)
  })

  it('serializes only safe fields via toJSON', () => {
    const err = new ConflictError('email taken')
    expect(err.toJSON()).toEqual({
      name: 'ConflictError',
      code: 'CONFLICT',
      message: 'email taken',
    })
  })

  describe('ValidationError', () => {
    it('defaults fieldErrors to an empty object', () => {
      expect(new ValidationError().fieldErrors).toEqual({})
    })

    it('carries provided field errors', () => {
      const err = new ValidationError('bad', {
        fieldErrors: { email: ['required'] },
      })
      expect(err.fieldErrors).toEqual({ email: ['required'] })
    })
  })

  describe('isAppError', () => {
    it('is true for AppError subclasses and false otherwise', () => {
      expect(isAppError(new InternalError())).toBe(true)
      expect(isAppError(new Error('plain'))).toBe(false)
      expect(isAppError('nope')).toBe(false)
      expect(isAppError(null)).toBe(false)
    })
  })

  describe('normalizeError', () => {
    it('returns AppError instances unchanged', () => {
      const original = new ForbiddenError()
      expect(normalizeError(original)).toBe(original)
    })

    it('wraps a plain Error, preserving message and cause', () => {
      const cause = new Error('db down')
      const result = normalizeError(cause)
      expect(result).toBeInstanceOf(InternalError)
      expect(result.message).toBe('db down')
      expect(result.cause).toBe(cause)
      expect(result.isOperational).toBe(false)
    })

    it('wraps non-Error throwables with a generic message', () => {
      const result = normalizeError('string thrown')
      expect(result).toBeInstanceOf(InternalError)
      expect(result.message).toBe('Unknown error')
      expect(result.cause).toBe('string thrown')
    })
  })
})
