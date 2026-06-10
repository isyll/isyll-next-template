import 'server-only'

import { userAuth } from '@workspace/auth'
import type { EvaluationContext, ResolutionDetails } from '@workspace/core'
import { headers } from 'next/headers'
import { cache } from 'react'

import type {
  BooleanFlagKey,
  FlagKey,
  FlagValueOf,
  JsonFlagKey,
  NumberFlagKey,
  StringFlagKey,
} from './catalog'
import { featureFlags } from './instance'

/**
 * Build the evaluation context for the current request from the user session.
 * Memoized per render with React `cache`, so checking several flags on one page
 * resolves the session once. The context is intentionally open: pass extra
 * attributes (plan, org, role…) via the `overrides` on the helpers below as your
 * domain grows — targeting rules can match any attribute you supply.
 */
export const resolveFlagContext = cache(
  async (): Promise<EvaluationContext> => {
    const session = await userAuth.api.getSession({ headers: await headers() })
    if (!session) return {}
    const { user } = session
    return {
      targetingKey: user.id,
      attributes: {
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        language: user.language,
      },
    }
  }
)

function mergeContext(
  base: EvaluationContext,
  overrides?: Partial<EvaluationContext>
): EvaluationContext {
  if (!overrides) return base
  const targetingKey = overrides.targetingKey ?? base.targetingKey
  return {
    ...(targetingKey !== undefined ? { targetingKey } : {}),
    attributes: { ...base.attributes, ...overrides.attributes },
  }
}

async function flagContext(
  overrides?: Partial<EvaluationContext>
): Promise<EvaluationContext> {
  return mergeContext(await resolveFlagContext(), overrides)
}

/** Resolve a boolean flag for the current user. */
export async function isEnabled(
  key: BooleanFlagKey,
  overrides?: Partial<EvaluationContext>
): Promise<boolean> {
  return featureFlags.getBoolean(key, await flagContext(overrides))
}

/** Resolve a string flag for the current user. */
export async function getStringFlag(
  key: StringFlagKey,
  overrides?: Partial<EvaluationContext>
): Promise<string> {
  return featureFlags.getString(key, await flagContext(overrides))
}

/** Resolve a number flag for the current user. */
export async function getNumberFlag(
  key: NumberFlagKey,
  overrides?: Partial<EvaluationContext>
): Promise<number> {
  return featureFlags.getNumber(key, await flagContext(overrides))
}

/** Resolve a JSON flag for the current user. */
export async function getJsonFlag<K extends JsonFlagKey>(
  key: K,
  overrides?: Partial<EvaluationContext>
): Promise<FlagValueOf<K>> {
  return featureFlags.getJson(key, await flagContext(overrides))
}

/** Full resolution details (value + reason + variant) for the current user. */
export async function getFlagDetails<K extends FlagKey>(
  key: K,
  overrides?: Partial<EvaluationContext>
): Promise<ResolutionDetails<FlagValueOf<K>>> {
  return featureFlags.getDetails(key, await flagContext(overrides))
}
