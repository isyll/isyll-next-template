import 'server-only'

import { db, getReadDb, schema } from '@workspace/db'
import { and, eq } from 'drizzle-orm'

import {
  mergePreferences,
  type NotificationChannel,
  type NotificationPreferences,
} from './channels'

const { notificationPreferences } = schema

/** A user's effective preferences across every channel. */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const rows = await getReadDb()
    .select({
      channel: notificationPreferences.channel,
      enabled: notificationPreferences.enabled,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
  return mergePreferences(rows)
}

/** Whether a channel is enabled for a user (defaults to enabled). */
export async function isChannelEnabled(
  userId: string,
  channel: NotificationChannel
): Promise<boolean> {
  const [row] = await getReadDb()
    .select({ enabled: notificationPreferences.enabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.channel, channel)
      )
    )
    .limit(1)
  return row ? row.enabled : true
}

/** Upsert a single channel preference. */
export async function setNotificationPreference(
  userId: string,
  channel: NotificationChannel,
  enabled: boolean
): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({ userId, channel, enabled })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.channel],
      set: { enabled },
    })
}
