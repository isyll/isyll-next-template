import 'server-only'

import { FeatureFlagClient } from './client'
import { DatabaseFlagProvider } from './database-provider'

/**
 * The application's feature-flag client, backed by Postgres + the two-tier
 * cache. Swap the provider here to change backends (see {@link FlagProvider}).
 */
export const featureFlags = new FeatureFlagClient(new DatabaseFlagProvider())

export { invalidateFlagCache } from './cache'
