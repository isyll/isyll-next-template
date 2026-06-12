import 'server-only'

import {
  type Paginated,
  type PaginationParams,
  paginated,
  toLimitOffset,
} from '@workspace/core'
import {
  db,
  getReadDb,
  notDeleted,
  schema,
  softDeletePatch,
} from '@workspace/db'
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'

const { notifications } = schema

export interface NotificationDTO {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  body?: string
  data?: Record<string, unknown>
  /**
   * Optional stable key making delivery idempotent. The outbox delivers
   * at-least-once, so an event handler can run twice; pass a dedupeKey (e.g.
   * `'welcome'` or `subscription:${id}`) and a replay is a no-op instead of a
   * duplicate notification.
   */
  dedupeKey?: string
}

type NotificationRow = typeof notifications.$inferSelect

function toDto(row: NotificationRow): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** A user's live notifications, newest first. Ownership enforced by `userId`. */
export async function listNotifications(
  userId: string,
  params: PaginationParams
): Promise<Paginated<NotificationDTO>> {
  const where = and(eq(notifications.userId, userId), notDeleted(notifications))
  const { limit, offset } = toLimitOffset(params)

  const read = getReadDb()
  const [rows, totals] = await Promise.all([
    read
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    read.select({ value: count() }).from(notifications).where(where),
  ])

  return paginated(rows.map(toDto), totals[0]?.value ?? 0, params)
}

/** Count of a user's unread, live notifications (for a badge). */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const totals = await getReadDb()
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        notDeleted(notifications)
      )
    )
  return totals[0]?.value ?? 0
}

/**
 * Create a notification — typically called by server code / background jobs.
 * When `dedupeKey` is set, a row that already exists for `(userId, dedupeKey)`
 * is left untouched and `null` is returned, so at-least-once event handlers can
 * replay safely. Without a `dedupeKey` a failed insert throws.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationDTO | null> {
  const values = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    data: input.data ?? {},
    dedupeKey: input.dedupeKey ?? null,
  }
  const [row] = input.dedupeKey
    ? await db
        .insert(notifications)
        .values(values)
        .onConflictDoNothing({
          target: [notifications.userId, notifications.dedupeKey],
          where: sql`${notifications.dedupeKey} is not null`,
        })
        .returning()
    : await db.insert(notifications).values(values).returning()
  if (!row) {
    // A dedupeKey conflict means it was already delivered — idempotent no-op.
    if (input.dedupeKey) return null
    throw new Error('Failed to create notification')
  }
  return toDto(row)
}

/** Mark one of the user's notifications read (scoped to the owner). */
export async function markNotificationRead(
  userId: string,
  id: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        notDeleted(notifications)
      )
    )
}

/** Mark all of the user's unread notifications read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        notDeleted(notifications)
      )
    )
}

/** Soft-delete one of the user's notifications (scoped to the owner). */
export async function deleteNotification(
  userId: string,
  id: string
): Promise<void> {
  await db
    .update(notifications)
    .set(softDeletePatch())
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
}
