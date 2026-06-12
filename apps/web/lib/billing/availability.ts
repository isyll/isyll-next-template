import 'server-only'

import { isBillingConfigured } from '@/lib/billing/stripe'
import { isEnabled } from '@/lib/feature-flags'

/**
 * The single gate for billing: it is available only when it is both credentialed
 * (the `STRIPE_*` env, `isBillingConfigured`) AND switched on (the
 * `billing.enabled` feature flag, so it can roll out gradually). Use this to
 * decide whether to show billing UI/nav and whether a billing action may run.
 *
 * Billing is fully optional — with the flag off (the default) or no `STRIPE_*`,
 * the nav link, page panel, and actions all degrade to "unavailable" with no
 * dead links. Request-scoped (reads the flag context), so call it from pages and
 * Server Actions, not from the outbox worker — handlers there gate on
 * `isBillingConfigured()` alone.
 */
export async function isBillingAvailable(): Promise<boolean> {
  return isBillingConfigured() && (await isEnabled('billing.enabled'))
}
