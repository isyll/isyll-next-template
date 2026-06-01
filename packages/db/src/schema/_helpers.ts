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
