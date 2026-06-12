import 'server-only'

import { userAuth } from '@workspace/auth'
import { UnauthorizedError } from '@workspace/core'
import { headers } from 'next/headers'

import { createBaseActionClient } from '@/lib/base-safe-action'
import { createRateLimiter, enforceRateLimit } from '@/lib/rate-limit'

/**
 * User-facing server-action clients, built on the shared base
 * (`@/lib/base-safe-action`): errors route through the observability
 * choke-point, only operational AppErrors surface their message, and each
 * action runs inside an OpenTelemetry span.
 */
export const actionClient = createBaseActionClient('action')

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
