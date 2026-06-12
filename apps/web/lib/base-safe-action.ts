import 'server-only'

import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from 'next-safe-action'
import * as z from 'zod'

import { reportError, type Scope } from '@/lib/observability'
import { withSpan } from '@/lib/otel'

/**
 * Shared base for the user (`@/lib/safe-action`) and operator
 * (`@/lib/admin-safe-action`) action clients. It provides the parts they had
 * duplicated verbatim: an `actionName` metadata schema, flattened validation
 * errors, the `reportError` choke-point (operational errors surface their
 * message, everything else is masked), and an OpenTelemetry span around each
 * action. Callers layer their own auth/permission middleware on top; the only
 * thing that varies is the reporting `scope`.
 */
export function createBaseActionClient(scope: Scope) {
  return createSafeActionClient({
    defineMetadataSchema() {
      return z.object({ actionName: z.string() })
    },
    defaultValidationErrorsShape: 'flattened',
    handleServerError(error, utils) {
      const normalized = reportError(error, {
        scope,
        action: utils.metadata.actionName,
      })
      return normalized.isOperational
        ? normalized.message
        : DEFAULT_SERVER_ERROR_MESSAGE
    },
  }).use(({ next, metadata }) =>
    withSpan(`action ${metadata.actionName}`, () => next())
  )
}
