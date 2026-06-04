import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginated,
  paginationParamsSchema,
  sortOrderSchema,
  toLimitOffset,
} from './pagination'

describe('paginationParamsSchema', () => {
  it('applies defaults when empty', () => {
    expect(paginationParamsSchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('coerces numeric strings (query params)', () => {
    expect(paginationParamsSchema.parse({ page: '3', pageSize: '50' })).toEqual(
      {
        page: 3,
        pageSize: 50,
      }
    )
  })

  it('rejects out-of-range values', () => {
    expect(paginationParamsSchema.safeParse({ page: 0 }).success).toBe(false)
    expect(
      paginationParamsSchema.safeParse({ pageSize: MAX_PAGE_SIZE + 1 }).success
    ).toBe(false)
    expect(paginationParamsSchema.safeParse({ page: 1.5 }).success).toBe(false)
  })
})

describe('sortOrderSchema', () => {
  it('accepts only asc/desc', () => {
    expect(sortOrderSchema.parse('asc')).toBe('asc')
    expect(sortOrderSchema.parse('desc')).toBe('desc')
    expect(sortOrderSchema.safeParse('sideways').success).toBe(false)
  })
})

describe('toLimitOffset', () => {
  it('maps page/pageSize to limit/offset', () => {
    expect(toLimitOffset({ page: 1, pageSize: 20 })).toEqual({
      limit: 20,
      offset: 0,
    })
    expect(toLimitOffset({ page: 3, pageSize: 25 })).toEqual({
      limit: 25,
      offset: 50,
    })
  })
})

describe('paginated', () => {
  const params = { page: 2, pageSize: 10 }

  it('computes page metadata for a middle page', () => {
    const result = paginated(['a', 'b'], 35, params)
    expect(result).toEqual({
      items: ['a', 'b'],
      page: 2,
      pageSize: 10,
      total: 35,
      pageCount: 4,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it('reports no next page on the last page', () => {
    const result = paginated([], 20, params)
    expect(result.pageCount).toBe(2)
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(true)
  })

  it('always has at least one page even when empty', () => {
    const result = paginated([], 0, { page: 1, pageSize: 10 })
    expect(result.pageCount).toBe(1)
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(false)
  })
})
