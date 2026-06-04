import { describe, expect, it } from 'vitest'

import { assertNever, invariant } from './assert'
import { InternalError } from './errors'

function maybeString(): string | null {
  return 'x'
}

describe('invariant', () => {
  it('passes for truthy conditions', () => {
    const present: unknown = { ok: true }
    expect(() => {
      invariant(present)
    }).not.toThrow()
  })

  it('throws an InternalError for falsy conditions', () => {
    const falsy: unknown = false
    const zero: unknown = 0
    expect(() => {
      invariant(falsy, 'must be set')
    }).toThrow(InternalError)
    expect(() => {
      invariant(zero)
    }).toThrow('Invariant violation')
  })

  it('narrows the type after asserting', () => {
    const value = maybeString()
    invariant(value, 'value required')
    // If this compiles, `value` was narrowed from `string | null` to `string`.
    expect(value.length).toBe(1)
  })
})

describe('assertNever', () => {
  it('throws with the offending value serialized', () => {
    // Cast through `never` to simulate an unhandled union variant at runtime.
    const unexpected = { kind: 'surprise' } as unknown as never
    expect(() => assertNever(unexpected)).toThrow(InternalError)
    expect(() => assertNever(unexpected)).toThrow(/surprise/)
  })
})
