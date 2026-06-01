import 'server-only'

import { auth } from '@workspace/auth'
import {
  ForbiddenError,
  normalizeError,
  UnauthorizedError,
} from '@workspace/core'
import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from 'next-safe-action'
import { headers } from 'next/headers'
import * as z from 'zod'

/**
 * Server-action clients. Errors thrown in actions are normalized; only
 * operational AppErrors surface their message — everything else is masked.
 */
export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({ actionName: z.string() })
  },
  defaultValidationErrorsShape: 'flattened',
  handleServerError(error, utils) {
    const normalized = normalizeError(error)
    console.error(`[action:${utils.metadata.actionName}]`, normalized)
    return normalized.isOperational
      ? normalized.message
      : DEFAULT_SERVER_ERROR_MESSAGE
  },
})

/** Requires an authenticated session; injects `ctx.user` / `ctx.session`. */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    throw new UnauthorizedError()
  }
  return next({ ctx: { user: session.user, session: session.session } })
})

/** Requires the `admin` role. */
export const adminActionClient = authActionClient.use(({ next, ctx }) => {
  if (ctx.user.role !== 'admin') {
    throw new ForbiddenError()
  }
  return next({ ctx })
})
