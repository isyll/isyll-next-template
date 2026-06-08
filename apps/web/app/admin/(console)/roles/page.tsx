import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { listPermissions, listRoles } from '@/features/admin-operators/queries'
import { getOperatorPermissions } from '@/lib/admin-permissions'

import { RolesManager } from './roles-manager'

export default async function RolesPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }
  const operatorPermissions = await getOperatorPermissions(session.user.id)
  if (!operatorPermissions.has('roles.read')) {
    redirect('/admin')
  }

  const t = await getTranslations('AdminRoles')
  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ])

  return (
    <div>
      <AdminPageHeader title={t('title')} description={t('subtitle')} />
      <RolesManager
        roles={roles}
        permissions={permissions}
        canManage={operatorPermissions.has('roles.write')}
      />
    </div>
  )
}
