import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { listOperators, listRoles } from '@/features/admin-operators/queries'
import { getOperatorPermissions } from '@/lib/admin-permissions'

import { OperatorsTable } from './operators-table'

export default async function OperatorsPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }
  const permissions = await getOperatorPermissions(session.user.id)
  if (!permissions.has('operators.read')) {
    redirect('/admin')
  }

  const t = await getTranslations('AdminOperators')
  const [operators, roles] = await Promise.all([listOperators(), listRoles()])

  return (
    <div>
      <AdminPageHeader title={t('title')} description={t('subtitle')} />
      <OperatorsTable
        operators={operators}
        roles={roles.map((role) => ({ id: role.id, name: role.name }))}
        canManage={permissions.has('operators.write')}
        selfId={session.user.id}
      />
    </div>
  )
}
