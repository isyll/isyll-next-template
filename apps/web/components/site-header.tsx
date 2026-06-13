import { userAuth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import Link from 'next/link'

import { Button, buttonVariants } from '@workspace/ui/components/button'
import { ModeToggle } from '@workspace/ui/components/mode-toggle'

import { LocaleSwitcher } from '@/components/locale-switcher'
import { NotificationBell } from '@/components/notification-bell'
import { isBillingAvailable } from '@/lib/billing/availability'
import { getUnreadNotificationCount } from '@/features/notifications/queries'
import { signOutAction } from '@/server/auth'

export async function SiteHeader() {
  const [tCommon, tNav, session] = await Promise.all([
    getTranslations('Common'),
    getTranslations('Nav'),
    userAuth.api.getSession({ headers: await headers() }),
  ])

  // Billing is optional: only surface its nav link when it's actually available
  // (configured + flag on), so projects without billing have no dead link.
  const [unreadCount, billingAvailable] = session
    ? await Promise.all([
        getUnreadNotificationCount(session.user.id),
        isBillingAvailable(),
      ])
    : [0, false]

  return (
    <header className='sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-5xl items-center justify-between px-4'>
        <Link
          href='/'
          className='inline-flex h-9 items-center font-semibold tracking-tight'
        >
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
              {billingAvailable ? (
                <Link
                  href='/dashboard/billing'
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                >
                  {tNav('billing')}
                </Link>
              ) : null}
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
