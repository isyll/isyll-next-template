import { adminAuth } from '@workspace/auth/admin'
import { paginationParamsSchema } from '@workspace/core'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button, buttonVariants } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'

import { AdminPageHeader } from '@/components/admin/page-header'
import { listUsers } from '@/features/admin-users/queries'
import { getOperatorPermissions } from '@/lib/admin-permissions'

import { UsersTable } from './users-table'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }
  const permissions = await getOperatorPermissions(session.user.id)
  if (!permissions.has('users.read')) {
    redirect('/admin')
  }

  const sp = await searchParams
  const t = await getTranslations('AdminUsers')
  const params = paginationParamsSchema.parse({ page: sp.page })
  const search = sp.q?.trim()
  const data = await listUsers({ ...params, ...(search ? { search } : {}) })
  const canManage = permissions.has('users.write')

  const pageHref = (page: number) => ({
    pathname: '/admin/users' as const,
    query: { page, ...(search ? { q: search } : {}) },
  })

  return (
    <div>
      <AdminPageHeader title={t('title')} description={t('subtitle')} />

      <form method='get' action='/admin/users' className='mb-4 flex gap-2'>
        <Input
          name='q'
          type='search'
          defaultValue={search ?? ''}
          placeholder={t('searchPlaceholder')}
          className='max-w-xs'
        />
        <Button type='submit' variant='outline'>
          {t('search')}
        </Button>
      </form>

      <UsersTable data={data} canManage={canManage} />

      <div className='mt-4 flex items-center justify-between text-sm text-muted-foreground'>
        <span>
          {t('summary', {
            page: data.page,
            pageCount: data.pageCount,
            total: data.total,
          })}
        </span>
        <div className='flex gap-2'>
          {data.hasPreviousPage ? (
            <Link
              href={pageHref(data.page - 1)}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('previous')}
            </Link>
          ) : null}
          {data.hasNextPage ? (
            <Link
              href={pageHref(data.page + 1)}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('next')}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
