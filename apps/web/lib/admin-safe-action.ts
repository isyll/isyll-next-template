import 'server-only'

import { adminAuth } from '@workspace/auth/admin'
import type { AdminPermissionKey } from '@workspace/auth/permissions'
import { ForbiddenError, UnauthorizedError } from '@workspace/core'
import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from 'next-safe-action'
import { headers } from 'next/headers'
import * as z from 'zod'

import { getOperatorPermissions } from '@/lib/admin-permissions'
import { reportError } from '@/lib/observability'

/**
 * Server-action client for operator-only actions. Completely separate from the
 * user-facing `authActionClient`: it validates against the admin BetterAuth
 * instance, so a valid USER session can never satisfy an admin action. The
 * operator's PBAC permission set is resolved once and injected as `ctx`.
 */
const baseAdminActionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({ actionName: z.string() })
  },
  defaultValidationErrorsShape: 'flattened',
  handleServerError(error, utils) {
    const normalized = reportError(error, {
      scope: 'admin-action',
      action: utils.metadata.actionName,
    })
    return normalized.isOperational
      ? normalized.message
      : DEFAULT_SERVER_ERROR_MESSAGE
  },
})

/** Requires an active operator session; injects `ctx.operator` and `ctx.permissions`. */
export const adminActionClient = baseAdminActionClient.use(async ({ next }) => {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session?.user.isActive) {
    throw new UnauthorizedError()
  }
  const permissions = await getOperatorPermissions(session.user.id)
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
