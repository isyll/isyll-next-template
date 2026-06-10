import 'server-only'

import type { EvaluationContext } from '@workspace/core'
import type { ReactNode } from 'react'

import type { BooleanFlagKey } from './catalog'
import { isEnabled } from './context'

interface FeatureGateProps {
  /** A boolean flag key from the catalogue. */
  flag: BooleanFlagKey
  /** Rendered when the flag is on. */
  children: ReactNode
  /** Rendered when the flag is off (default: nothing). */
  fallback?: ReactNode
  /** Extra evaluation-context attributes (merged over the session context). */
  context?: Partial<EvaluationContext>
}

/**
 * Server Component that renders `children` only when a boolean flag is enabled
 * for the current user. Keep flag gating on the server; pass the resolved value
 * down as a prop when a Client Component needs it.
 *
 * @example
 * <FeatureGate flag="ui.newDashboard" fallback={<LegacyDashboard />}>
 *   <NewDashboard />
 * </FeatureGate>
 */
export async function FeatureGate({
  flag,
  children,
  fallback = null,
  context,
}: FeatureGateProps): Promise<ReactNode> {
  const enabled = await isEnabled(flag, context)
  return enabled ? children : fallback
}
