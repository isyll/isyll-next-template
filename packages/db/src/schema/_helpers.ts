import { timestamp } from 'drizzle-orm/pg-core'

/**
 * Spread into every table for consistent, timezone-aware audit columns.
 * `$onUpdate` fires on Drizzle `.update()` calls.
 */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/**
 * Spread into entity tables that support soft-delete. A `null` value means the
 * row is live; a timestamp means it was soft-deleted at that instant. Filter
 * queries with `notDeleted()` / `onlyDeleted()` and remove rows with
 * `softDeletePatch()` (see `@workspace/db` soft-delete helpers).
 */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}
