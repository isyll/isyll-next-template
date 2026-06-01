/** Reusable pagination & sorting DTO primitives (Zod 4). */
import * as z from 'zod'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
})

export type PaginationParams = z.infer<typeof paginationParamsSchema>

export const sortOrderSchema = z.enum(['asc', 'desc'])
export type SortOrder = z.infer<typeof sortOrderSchema>

export interface Paginated<T> {
  readonly items: readonly T[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly pageCount: number
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
}

/** Convert a page/pageSize into a SQL-style `limit`/`offset`. */
export function toLimitOffset(params: PaginationParams): {
  limit: number
  offset: number
} {
  return {
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
  }
}

/** Wrap a fetched page of items + a total count into a {@link Paginated}. */
export function paginated<T>(
  items: readonly T[],
  total: number,
  params: PaginationParams
): Paginated<T> {
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize))
  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    total,
    pageCount,
    hasNextPage: params.page < pageCount,
    hasPreviousPage: params.page > 1,
  }
}
