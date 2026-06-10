import { userAuth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getNotificationPreferences } from '@/features/notifications/preferences'
import { listNotifications } from '@/features/notifications/queries'

import { NotificationsInbox } from './notifications-inbox'

export default async function NotificationsPage() {
  const session = await userAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const t = await getTranslations('Notifications')
  const [page, preferences] = await Promise.all([
    listNotifications(session.user.id, { page: 1, pageSize: 30 }),
    getNotificationPreferences(session.user.id),
  ])

  return (
    <main className='mx-auto w-full max-w-2xl space-y-8 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground'>{t('subtitle')}</p>
      </div>
      <NotificationsInbox items={page.items} preferences={preferences} />
    </main>
  )
}
