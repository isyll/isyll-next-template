import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { Button } from '@workspace/ui/components/button'

import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { getOperatorPermissions } from '@/lib/admin-permissions'
import { siteConfig } from '@/lib/site-config'

import { signOutAdminAction } from '../actions'

/**
 * Authenticated operator-console shell: a permission-aware sidebar + a topbar.
 * Re-verifies the operator session server-side (defense in depth — the proxy
 * guard is only optimistic) and resolves PBAC permissions once for the nav.
 * `/admin/login` lives outside this group, so it renders without the shell.
 */
export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session?.user.isActive) {
    redirect('/admin/login')
  }

  const permissions = [...(await getOperatorPermissions(session.user.id))]
  const t = await getTranslations('Admin')

  return (
    <div className='flex min-h-svh'>
      <AdminSidebar permissions={permissions} appName={siteConfig.name} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-14 items-center justify-between gap-4 border-b bg-card px-6'>
          <span className='truncate text-sm text-muted-foreground'>
            {session.user.email}
          </span>
          <form action={signOutAdminAction}>
            <Button type='submit' variant='outline' size='sm'>
              {t('signOut')}
            </Button>
          </form>
        </header>
        <main className='flex-1 overflow-y-auto p-6'>{children}</main>
      </div>
    </div>
  )
}
