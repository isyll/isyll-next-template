import 'server-only'

import { userAuth } from '@workspace/auth'
import { UnauthorizedError } from '@workspace/core'
import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from 'next-safe-action'
import { headers } from 'next/headers'
import * as z from 'zod'

import { reportError } from '@/lib/observability'
import { createRateLimiter, enforceRateLimit } from '@/lib/rate-limit'

/**
 * Server-action clients. Errors thrown in actions are normalized and reported
 * through the observability choke-point; only operational AppErrors surface
 * their message — everything else is masked.
 */
export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({ actionName: z.string() })
  },
  defaultValidationErrorsShape: 'flattened',
  handleServerError(error, utils) {
    const normalized = reportError(error, {
      scope: 'action',
      action: utils.metadata.actionName,
    })
    return normalized.isOperational
      ? normalized.message
      : DEFAULT_SERVER_ERROR_MESSAGE
  },
})

/** Requires an authenticated session; injects `ctx.user` / `ctx.session`. */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await userAuth.api.getSession({ headers: await headers() })
  if (!session) {
    throw new UnauthorizedError()
  }
  return next({ ctx: { user: session.user, session: session.session } })
})

// Per-user limiter for sensitive/expensive actions. Tune per project, or build
// dedicated limiters (e.g. a stricter one for password changes) with
// `createRateLimiter`.
const perUserActionLimiter = createRateLimiter({
  tokens: 20,
  windowSeconds: 10,
  prefix: 'action:user',
})

/**
 * Like `authActionClient`, but additionally rate-limited per authenticated user.
 * Use for actions that are sensitive or costly to run.
 */
export const rateLimitedActionClient = authActionClient.use(
  async ({ next, ctx }) => {
    await enforceRateLimit(perUserActionLimiter, ctx.user.id)
    return next({ ctx })
  }
)
