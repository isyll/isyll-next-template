import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { AdminPageHeader } from '@/components/admin/page-header'
import { getOperatorPermissions } from '@/lib/admin-permissions'

export default async function AdminDashboardPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }

  const t = await getTranslations('Admin')
  const permissions = [
    ...(await getOperatorPermissions(session.user.id)),
  ].sort()

  return (
    <div>
      <AdminPageHeader
        title={t('title')}
        description={t('welcome', { email: session.user.email })}
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('permissions')}</CardTitle>
          <CardDescription>{t('permissionsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length > 0 ? (
            <ul className='flex flex-wrap gap-2'>
              {permissions.map((key) => (
                <li
                  key={key}
                  className='rounded-md border bg-muted px-2 py-1 font-mono text-xs'
                >
                  {key}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-muted-foreground'>
              {t('noPermissions')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
