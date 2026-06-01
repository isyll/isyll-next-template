import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { Button } from '@workspace/ui/components/button'

import { signOutAdminAction } from './actions'

export default async function AdminDashboardPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }

  const t = await getTranslations('Admin')

  return (
    <main className='mx-auto w-full max-w-3xl space-y-8 px-4 py-10'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('title')}
          </h1>
          <p className='text-muted-foreground'>
            {t('welcome', { email: session.user.email })}
          </p>
          <p className='text-sm text-muted-foreground'>
            {t('role')}: {session.user.role}
          </p>
        </div>
        <form action={signOutAdminAction}>
          <Button type='submit' variant='outline'>
            {t('signOut')}
          </Button>
        </form>
      </div>
    </main>
  )
}
