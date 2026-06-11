import { userAuth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import Link from 'next/link'

import { Button, buttonVariants } from '@workspace/ui/components/button'
import { ModeToggle } from '@workspace/ui/components/mode-toggle'

import { LocaleSwitcher } from '@/components/locale-switcher'
import { NotificationBell } from '@/components/notification-bell'
import { getUnreadNotificationCount } from '@/features/notifications/queries'
import { signOutAction } from '@/server/auth'

export async function SiteHeader() {
  const [tCommon, tNav, session] = await Promise.all([
    getTranslations('Common'),
    getTranslations('Nav'),
    userAuth.api.getSession({ headers: await headers() }),
  ])

  const unreadCount = session
    ? await getUnreadNotificationCount(session.user.id)
    : 0

  return (
    <header className='sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-5xl items-center justify-between px-4'>
        <Link href='/' className='font-semibold tracking-tight'>
          {tCommon('appName')}
        </Link>
        <nav className='flex items-center gap-1.5'>
          <LocaleSwitcher />
          <ModeToggle />
          {session ? (
            <>
              <Link
                href='/dashboard'
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {tNav('dashboard')}
              </Link>
              <Link
                href='/dashboard/files'
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {tNav('files')}
              </Link>
              <Link
                href='/dashboard/billing'
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {tNav('billing')}
              </Link>
              <NotificationBell initialCount={unreadCount} />
              <form action={signOutAction}>
                <Button type='submit' variant='outline' size='sm'>
                  {tNav('logout')}
                </Button>
              </form>
            </>
          ) : (
            <Link
              href='/login'
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              {tNav('login')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
