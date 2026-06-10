'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { NOTIFICATION_CHANNELS } from '@/features/notifications/channels'
import { setNotificationPreference } from '@/features/notifications/preferences'
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/queries'
import { publishNotificationChange } from '@/lib/notifications-stream'
import { authActionClient } from '@/lib/safe-action'

const INBOX_PATH = '/dashboard/notifications'

export const markNotificationReadAction = authActionClient
  .metadata({ actionName: 'notifications.markRead' })
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await markNotificationRead(ctx.user.id, parsedInput.id)
    await publishNotificationChange(ctx.user.id)
    revalidatePath(INBOX_PATH)
  })

export const markAllNotificationsReadAction = authActionClient
  .metadata({ actionName: 'notifications.markAllRead' })
  .action(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id)
    await publishNotificationChange(ctx.user.id)
    revalidatePath(INBOX_PATH)
  })

export const deleteNotificationAction = authActionClient
  .metadata({ actionName: 'notifications.delete' })
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await deleteNotification(ctx.user.id, parsedInput.id)
    await publishNotificationChange(ctx.user.id)
    revalidatePath(INBOX_PATH)
  })

export const setNotificationPreferenceAction = authActionClient
  .metadata({ actionName: 'notifications.setPreference' })
  .inputSchema(
    z.object({
      channel: z.enum(NOTIFICATION_CHANNELS),
      enabled: z.boolean(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    await setNotificationPreference(
      ctx.user.id,
      parsedInput.channel,
      parsedInput.enabled
    )
    revalidatePath(INBOX_PATH)
  })
