import { and, isNotNull, isNull, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

/**
 * Reusable soft-delete helpers. Entity tables carry a nullable `deleted_at`
 * (see the `softDelete` column helper); a `null` value means the row is live.
 *
 * Usage:
 *   db.select().from(users).where(notDeleted(users))
 *   db.update(users).set(softDeletePatch()).where(and(notDeleted(users), eq(...)))
 *   db.update(users).set(restorePatch()).where(and(onlyDeleted(users), eq(...)))
 */
export interface SoftDeletable {
  deletedAt: PgColumn
}

/** `WHERE` fragment matching only live (not soft-deleted) rows. */
export function notDeleted(table: SoftDeletable): SQL {
  return isNull(table.deletedAt)
}

/** `WHERE` fragment matching only soft-deleted rows. */
export function onlyDeleted(table: SoftDeletable): SQL {
  return isNotNull(table.deletedAt)
}

/**
 * AND together `notDeleted(table)` with any extra conditions. Convenience for
 * the common "live rows matching X" query.
 */
export function liveWhere(
  table: SoftDeletable,
  ...conditions: (SQL | undefined)[]
): SQL | undefined {
  return and(notDeleted(table), ...conditions)
}

/** `.set()` payload that soft-deletes a row (stamps `deleted_at = now`). */
export function softDeletePatch(): { deletedAt: Date } {
  return { deletedAt: new Date() }
}

/** `.set()` payload that restores a soft-deleted row (clears `deleted_at`). */
export function restorePatch(): { deletedAt: null } {
  return { deletedAt: null }
}
