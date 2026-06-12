import 'server-only'

import { adminAuth, type AdminSession } from '@workspace/auth/admin'
import type { AdminPermissionKey } from '@workspace/auth/permissions'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getOperatorPermissions } from '@/lib/admin-permissions'

interface OperatorContext {
  operator: AdminSession['user']
  permissions: Set<string>
}

/**
 * Server-side gate for operator-console pages (defense in depth alongside
 * `adminActionClient` and the proxy). Re-verifies the operator session,
 * enforces the baseline `console.access`, and optionally a page-specific
 * permission — redirecting to login or the dashboard on failure. Returns the
 * operator and their resolved permission set so the page can branch on
 * finer-grained keys (e.g. show write controls).
 *
 *   const { permissions } = await requireOperator('users.read')
 */
export async function requireOperator(
  permission?: AdminPermissionKey
): Promise<OperatorContext> {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session?.user.isActive) {
    redirect('/admin/login')
  }
  const permissions = await getOperatorPermissions(session.user.id)
  if (!permissions.has('console.access')) {
    redirect('/admin/login')
  }
  if (permission && !permissions.has(permission)) {
    redirect('/admin')
  }
  return { operator: session.user, permissions }
}
