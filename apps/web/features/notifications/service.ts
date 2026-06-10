import 'server-only'

import { publishNotificationChange } from '@/lib/notifications-stream'

import { isChannelEnabled } from './preferences'
import {
  createNotification,
  type CreateNotificationInput,
  type NotificationDTO,
} from './queries'

/**
 * Deliver an in-app notification, honoring the user's channel preference and
 * pushing a realtime signal so open inboxes update. Returns `null` when the user
 * has disabled the in-app channel. Prefer this over `createNotification` from
 * event handlers / jobs.
 */
export async function deliverNotification(
  input: CreateNotificationInput
): Promise<NotificationDTO | null> {
  if (!(await isChannelEnabled(input.userId, 'in_app'))) return null
  const notification = await createNotification(input)
  await publishNotificationChange(input.userId)
  return notification
}
