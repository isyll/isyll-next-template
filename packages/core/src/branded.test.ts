import { describe, expect, it } from 'vitest'

import { type Brand, unbrand } from './branded'

type UserId = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

describe('branded types', () => {
  it('unbrand returns the underlying value unchanged', () => {
    const id = 'user_123' as UserId
    expect(unbrand(id)).toBe('user_123')
  })

  it('keeps nominal types distinct at compile time', () => {
    const userId = 'u1' as UserId
    const orderId = 'o1' as OrderId
    // @ts-expect-error a UserId is not assignable to an OrderId
    const wrong: OrderId = userId
    expect([unbrand(userId), unbrand(orderId), unbrand(wrong)]).toEqual([
      'u1',
      'o1',
      'u1',
    ])
  })
})
