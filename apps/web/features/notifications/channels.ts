/**
 * Client-safe notification-channel definitions and pure preference helpers
 * (no `server-only`, no DB) so Client Components, Server Actions and tests can
 * all share them. The DB-backed reads/writes live in `preferences.ts`.
 */

/** Delivery channels a notification can use. */
export const NOTIFICATION_CHANNELS = ['in_app', 'email'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export type NotificationPreferences = Record<NotificationChannel, boolean>

/** Defaults: every channel enabled. Pure. */
export function defaultNotificationPreferences(): NotificationPreferences {
  return { in_app: true, email: true }
}

/** Overlay stored rows on the defaults (a missing channel stays enabled). Pure. */
export function mergePreferences(
  rows: readonly { channel: NotificationChannel; enabled: boolean }[]
): NotificationPreferences {
  const preferences = defaultNotificationPreferences()
  for (const row of rows) preferences[row.channel] = row.enabled
  return preferences
}
