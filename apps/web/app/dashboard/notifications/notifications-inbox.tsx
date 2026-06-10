'use client'

import { Check, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'

import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationPreferences,
} from '@/features/notifications/channels'
import type { NotificationDTO } from '@/features/notifications/queries'

import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  setNotificationPreferenceAction,
} from './actions'

export function NotificationsInbox({
  items,
  preferences,
}: {
  items: readonly NotificationDTO[]
  preferences: NotificationPreferences
}) {
  const t = useTranslations('Notifications')
  const tErr = useTranslations('Errors')
  const router = useRouter()
  const [prefs, setPrefs] = useState(preferences)
  const [busy, setBusy] = useState(false)

  const hasUnread = items.some((item) => item.readAt === null)

  const channelLabel = (channel: NotificationChannel): string =>
    channel === 'in_app' ? t('channelInApp') : t('channelEmail')

  async function markRead(id: string): Promise<void> {
    const result = await markNotificationReadAction({ id })
    if (result.serverError) {
      toast.error(tErr('generic'))
      return
    }
    router.refresh()
  }

  async function remove(id: string): Promise<void> {
    const result = await deleteNotificationAction({ id })
    if (result.serverError) {
      toast.error(tErr('generic'))
      return
    }
    toast.success(t('deleted'))
    router.refresh()
  }

  async function markAll(): Promise<void> {
    setBusy(true)
    const result = await markAllNotificationsReadAction()
    setBusy(false)
    if (result.serverError) {
      toast.error(tErr('generic'))
      return
    }
    toast.success(t('allRead'))
    router.refresh()
  }

  async function togglePreference(
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<void> {
    setPrefs((prev) => ({ ...prev, [channel]: enabled }))
    const result = await setNotificationPreferenceAction({ channel, enabled })
    if (result.serverError) {
      setPrefs((prev) => ({ ...prev, [channel]: !enabled }))
      toast.error(tErr('generic'))
    }
  }

  return (
    <div className='space-y-8'>
      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-medium text-muted-foreground'>
            {t('inboxHeading')}
          </h2>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={busy || !hasUnread}
            onClick={() => {
              void markAll()
            }}
          >
            {t('markAllRead')}
          </Button>
        </div>

        {items.length === 0 ? (
          <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
            {t('empty')}
          </p>
        ) : (
          <ul className='divide-y rounded-md border bg-card'>
            {items.map((item) => (
              <li key={item.id} className='flex items-start gap-3 p-4'>
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    item.readAt === null ? 'bg-primary' : 'bg-transparent'
                  }`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='font-medium'>{item.title}</div>
                  {item.body ? (
                    <p className='text-sm text-muted-foreground'>{item.body}</p>
                  ) : null}
                  <time className='text-xs text-muted-foreground'>
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
                {item.readAt === null ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    aria-label={t('markRead')}
                    onClick={() => {
                      void markRead(item.id)
                    }}
                  >
                    <Check className='size-4' aria-hidden />
                  </Button>
                ) : null}
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  aria-label={t('delete')}
                  onClick={() => {
                    void remove(item.id)
                  }}
                >
                  <Trash2 className='size-4' aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium text-muted-foreground'>
          {t('preferencesHeading')}
        </h2>
        <ul className='space-y-3 rounded-md border bg-card p-4'>
          {NOTIFICATION_CHANNELS.map((channel) => (
            <li key={channel} className='flex items-center gap-3'>
              <Checkbox
                id={`channel-${channel}`}
                checked={prefs[channel]}
                onCheckedChange={(checked) => {
                  void togglePreference(channel, checked)
                }}
              />
              <label htmlFor={`channel-${channel}`} className='text-sm'>
                {channelLabel(channel)}
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
