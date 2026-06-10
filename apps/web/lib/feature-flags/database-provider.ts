import 'server-only'

import {
  type EvaluationContext,
  evaluateFlag,
  type FlagEvaluation,
} from '@workspace/core'

import { getCachedFlag } from './cache'
import { flagNotFound, type FlagProvider } from './provider'
import { readFlag } from './store'

/**
 * The production provider: resolves flags from `app.feature_flags` through the
 * two-tier cache. Degrades safely — an unconfigured key returns `FLAG_NOT_FOUND`
 * so the client falls back to the catalogue default.
 */
export class DatabaseFlagProvider implements FlagProvider {
  readonly name = 'database'

  async resolve(
    key: string,
    context: EvaluationContext
  ): Promise<FlagEvaluation> {
    const definition = await getCachedFlag(key, () => readFlag(key))
    return definition ? evaluateFlag(definition, context) : flagNotFound(key)
  }
}
