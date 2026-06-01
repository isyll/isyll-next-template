import { describe, expect, it } from 'vitest'

import { andThen, err, isErr, isOk, map, ok, unwrapOr } from './result'

describe('Result', () => {
  it('constructs and narrows ok / err', () => {
    expect(isOk(ok(1))).toBe(true)
    expect(isErr(err('boom'))).toBe(true)
    expect(isOk(err('boom'))).toBe(false)
  })

  it('map transforms only the ok value', () => {
    expect(map(ok(2), (n) => n * 2)).toEqual(ok(4))
    expect(map(err('e'), (n: number) => n * 2)).toEqual(err('e'))
  })

  it('andThen chains', () => {
    expect(andThen(ok(2), (n) => ok(n + 1))).toEqual(ok(3))
  })

  it('unwrapOr falls back on err', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5)
    expect(unwrapOr(err('e'), 42)).toBe(42)
  })
})
