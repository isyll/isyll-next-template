import { describe, expect, it } from 'vitest'

import { userSelectSchema } from './user'

describe('userSelectSchema', () => {
  it('mirrors the users table columns', () => {
    expect(Object.keys(userSelectSchema.shape).sort()).toEqual(
      [
        'createdAt',
        'deletedAt',
        'email',
        'emailVerified',
        'id',
        'image',
        'language',
        'name',
        'updatedAt',
      ].sort()
    )
  })

  it('rejects an empty object (required columns are missing)', () => {
    expect(userSelectSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a row missing a required column (email)', () => {
    const result = userSelectSchema.safeParse({
      id: 'u1',
      name: 'Jane',
      emailVerified: true,
      image: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })
})
