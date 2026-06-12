import 'server-only'

import { adminAuth } from '@workspace/auth/admin'
import type { AdminPermissionKey } from '@workspace/auth/permissions'
import { ForbiddenError, UnauthorizedError } from '@workspace/core'
import { headers } from 'next/headers'

import { getOperatorPermissions } from '@/lib/admin-permissions'
import { createBaseActionClient } from '@/lib/base-safe-action'

/**
 * Server-action client for operator-only actions, built on the shared base
 * (`@/lib/base-safe-action`). Completely separate from the user-facing
 * `authActionClient`: it validates against the admin BetterAuth instance, so a
 * valid USER session can never satisfy an admin action. The operator's PBAC
 * permission set is resolved once and injected as `ctx`.
 */
const baseAdminActionClient = createBaseActionClient('admin-action')

/**
 * Requires an active operator session that holds the baseline `console.access`
 * permission; injects `ctx.operator` and `ctx.permissions`. `console.access` is
 * the gate to the console — an operator without it (no roles, or roles that
 * don't grant it) is rejected here and by the console layout, so per-resource
 * permissions are never the only thing standing between an account and admin.
 */
export const adminActionClient = baseAdminActionClient.use(async ({ next }) => {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session?.user.isActive) {
    throw new UnauthorizedError()
  }
  const permissions = await getOperatorPermissions(session.user.id)
  if (!permissions.has('console.access')) {
    throw new ForbiddenError()
  }
  return next({
    ctx: { operator: session.user, session: session.session, permissions },
  })
})

/** Operator action client that additionally requires a specific permission. */
export function adminActionWithPermission(required: AdminPermissionKey) {
  return adminActionClient.use(({ next, ctx }) => {
    if (!ctx.permissions.has(required)) {
      throw new ForbiddenError()
    }
    return next({ ctx })
  })
}
