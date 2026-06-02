import 'server-only'

import { adminAuth } from '@workspace/auth/admin'
import { normalizeError, UnauthorizedError } from '@workspace/core'
import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from 'next-safe-action'
import { headers } from 'next/headers'
import * as z from 'zod'

/**
 * Server-action client for admin-only actions. Completely separate from the
 * user-facing `authActionClient`: it validates against the admin BetterAuth
 * instance, so a valid USER session can never satisfy an admin action.
 */
const baseAdminActionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({ actionName: z.string() })
  },
  defaultValidationErrorsShape: 'flattened',
  handleServerError(error, utils) {
    const normalized = normalizeError(error)
    console.error(`[admin-action:${utils.metadata.actionName}]`, normalized)
    return normalized.isOperational
      ? normalized.message
      : DEFAULT_SERVER_ERROR_MESSAGE
  },
})

/** Requires a valid admin session; injects `ctx.admin` / `ctx.session`. */
export const adminActionClient = baseAdminActionClient.use(async ({ next }) => {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    throw new UnauthorizedError()
  }
  return next({ ctx: { admin: session.user, session: session.session } })
})
