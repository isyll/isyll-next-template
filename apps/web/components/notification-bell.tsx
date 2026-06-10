'use client'

import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Notification bell with a live unread badge. Subscribes to the SSE stream
 * (`/api/notifications/stream`) so the badge updates in realtime; clicking opens
 * the inbox. Server-rendered initial count avoids a flash of "0".
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const t = useTranslations('Notifications')
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const source = new EventSource('/api/notifications/stream')
    source.addEventListener('unread', (event) => {
      const value = Number((event as MessageEvent<string>).data)
      if (Number.isFinite(value)) setCount(value)
    })
    return () => {
      source.close()
    }
  }, [])

  return (
    <Link
      href='/dashboard/notifications'
      aria-label={t('bellLabel', { count })}
      className='relative inline-flex size-9 items-center justify-center rounded-md text-foreground/80 hover:bg-accent hover:text-foreground'
    >
      <Bell className='size-5' aria-hidden />
      {count > 0 ? (
        <span className='absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground'>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}
