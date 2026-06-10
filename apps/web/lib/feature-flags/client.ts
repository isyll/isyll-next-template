import {
  type EvaluationContext,
  type EvaluationReason,
  type FlagErrorCode,
  type FlagValue,
  type FlagValueType,
  isFlagValueOfType,
  type ResolutionDetails,
} from '@workspace/core'

import {
  type BooleanFlagKey,
  FLAGS,
  type FlagKey,
  type FlagValueOf,
  type JsonFlagKey,
  type NumberFlagKey,
  type StringFlagKey,
} from './catalog'
import type { FlagProvider } from './provider'

interface OptionalDetails {
  variant?: string | undefined
  ruleIndex?: number | undefined
  errorCode?: FlagErrorCode | undefined
  errorMessage?: string | undefined
}

/** Assemble resolution details, omitting optional keys that are undefined. */
function buildDetails<T extends FlagValue>(
  value: T,
  reason: EvaluationReason,
  extra: OptionalDetails = {}
): ResolutionDetails<T> {
  return {
    value,
    reason,
    ...(extra.variant !== undefined ? { variant: extra.variant } : {}),
    ...(extra.ruleIndex !== undefined ? { ruleIndex: extra.ruleIndex } : {}),
    ...(extra.errorCode !== undefined ? { errorCode: extra.errorCode } : {}),
    ...(extra.errorMessage !== undefined
      ? { errorMessage: extra.errorMessage }
      : {}),
  }
}

/**
 * Type-safe feature-flag client. Generic over the {@link FlagProvider} seam, so
 * the same evaluation/coercion semantics apply whatever the backend is.
 *
 * Keys and value types are checked against the {@link FLAGS} catalogue: the
 * catalogue default is the guaranteed fallback when no override is configured,
 * the provider errors, or a stored value has the wrong type — so a flag check
 * never throws and always returns a sensible value (OpenFeature semantics).
 */
export class FeatureFlagClient {
  constructor(private readonly provider: FlagProvider) {}

  async getBoolean(
    key: BooleanFlagKey,
    context?: EvaluationContext
  ): Promise<boolean> {
    return (await this.getDetails(key, context)).value
  }

  async getString(
    key: StringFlagKey,
    context?: EvaluationContext
  ): Promise<string> {
    return (await this.getDetails(key, context)).value
  }

  async getNumber(
    key: NumberFlagKey,
    context?: EvaluationContext
  ): Promise<number> {
    return (await this.getDetails(key, context)).value
  }

  async getJson<K extends JsonFlagKey>(
    key: K,
    context?: EvaluationContext
  ): Promise<FlagValueOf<K>> {
    return (await this.getDetails(key, context)).value
  }

  /** Full resolution details (value + reason + variant) for diagnostics/UI. */
  async getDetails<K extends FlagKey>(
    key: K,
    context: EvaluationContext = {}
  ): Promise<ResolutionDetails<FlagValueOf<K>>> {
    const spec = FLAGS[key]
    const fallback = spec.defaultValue as FlagValueOf<K>
    return this.coerce(key, spec.type, fallback, context)
  }

  private async coerce<T extends FlagValue>(
    key: FlagKey,
    type: FlagValueType,
    fallback: T,
    context: EvaluationContext
  ): Promise<ResolutionDetails<T>> {
    let evaluation
    try {
      evaluation = await this.provider.resolve(key, context)
    } catch (error) {
      return buildDetails(fallback, 'ERROR', {
        errorCode: 'GENERAL',
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    }

    const { value, reason, variant, ruleIndex, errorCode, errorMessage } =
      evaluation

    if (value === undefined) {
      // No DB override is the normal degrade-safe path → catalogue default.
      if (errorCode === 'FLAG_NOT_FOUND') {
        return buildDetails(fallback, 'STATIC')
      }
      return buildDetails(fallback, 'ERROR', { errorCode, errorMessage })
    }

    if (!isFlagValueOfType(value, type)) {
      return buildDetails(fallback, 'ERROR', {
        errorCode: 'TYPE_MISMATCH',
        errorMessage: `Flag "${key}" resolved to ${typeof value}, expected ${type}`,
        ...(variant !== undefined ? { variant } : {}),
      })
    }

    return buildDetails(value as T, reason, { variant, ruleIndex })
  }
}
