/**
 * Feature flags — a DB-backed, Redis-cached, OpenFeature-style flag service.
 *
 * Server-first usage:
 *   import { isEnabled } from '@/lib/feature-flags'
 *   if (await isEnabled('billing.enabled')) { … }
 *
 *   import { FeatureGate } from '@/lib/feature-flags'
 *   <FeatureGate flag="ui.newDashboard"><NewDashboard /></FeatureGate>
 *
 * The evaluation engine lives in `@workspace/core`; this module wires it to the
 * database, cache and the current request's user. See `docs/feature-flags.md`.
 */
export {
  FLAGS,
  FLAG_KEYS,
  flagSpec,
  catalogDefinition,
  type FlagKey,
  type FlagSpec,
  type FlagCatalog,
  type FlagValueOf,
  type BooleanFlagKey,
  type StringFlagKey,
  type NumberFlagKey,
  type JsonFlagKey,
} from './catalog'
export { FeatureFlagClient } from './client'
export { type FlagProvider, StaticFlagProvider, flagNotFound } from './provider'
export { DatabaseFlagProvider } from './database-provider'
export { featureFlags, invalidateFlagCache } from './instance'
export {
  resolveFlagContext,
  isEnabled,
  getStringFlag,
  getNumberFlag,
  getJsonFlag,
  getFlagDetails,
} from './context'
export { FeatureGate } from './react'
export {
  readFlag,
  readAllFlags,
  writeFlag,
  setFlagEnabled,
  removeFlag,
  type WriteFlagInput,
} from './store'
