import { describe, expect, it } from 'vitest'

import {
  andThen,
  err,
  fromPromise,
  fromThrowable,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  unwrapOr,
} from './result'

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

  it('mapErr transforms only the err value', () => {
    expect(mapErr(err('e'), (s) => `${s}!`)).toEqual(err('e!'))
    expect(mapErr(ok(1), (s: string) => `${s}!`)).toEqual(ok(1))
  })

  it('andThen chains and short-circuits on err', () => {
    expect(andThen(ok(2), (n) => ok(n + 1))).toEqual(ok(3))
    expect(andThen(err<string>('e'), (n: number) => ok(n + 1))).toEqual(
      err('e')
    )
  })

  it('unwrapOr falls back on err', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5)
    expect(unwrapOr(err('e'), 42)).toBe(42)
  })

  it('match dispatches to the right handler', () => {
    const handlers = {
      ok: (n: number) => `ok:${n}`,
      err: (e: string) => `err:${e}`,
    }
    expect(match(ok(1), handlers)).toBe('ok:1')
    expect(match(err('boom'), handlers)).toBe('err:boom')
  })

  describe('fromThrowable', () => {
    it('captures a returned value as ok', () => {
      expect(fromThrowable(() => 7)).toEqual(ok(7))
    })

    it('captures a thrown value as err', () => {
      const boom = new Error('boom')
      expect(
        fromThrowable(() => {
          throw boom
        })
      ).toEqual(err(boom))
    })
  })

  describe('fromPromise', () => {
    it('captures a resolved value as ok', async () => {
      await expect(fromPromise(Promise.resolve(7))).resolves.toEqual(ok(7))
    })

    it('captures a rejection as err', async () => {
      const boom = new Error('boom')
      await expect(fromPromise(Promise.reject(boom))).resolves.toEqual(
        err(boom)
      )
    })
  })
})
