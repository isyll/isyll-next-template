'use server'

import { ForbiddenError } from '@workspace/core'

import {
  getStripeCustomerId,
  upsertBillingCustomer,
} from '@/features/billing/queries'
import {
  createBillingPortalSession,
  createCheckoutSession,
  createStripeCustomer,
  getStripePriceId,
  isBillingConfigured,
} from '@/lib/billing/stripe'
import { isEnabled } from '@/lib/feature-flags'
import { authActionClient } from '@/lib/safe-action'
import { siteConfig } from '@/lib/site-config'

const BILLING_PATH = `${siteConfig.url}/dashboard/billing`

async function ensureStripeCustomer(user: {
  id: string
  email: string
  name: string
}): Promise<string> {
  const existing = await getStripeCustomerId(user.id)
  if (existing) return existing
  const customer = await createStripeCustomer({
    email: user.email,
    name: user.name,
    userId: user.id,
  })
  await upsertBillingCustomer(user.id, customer.id)
  return customer.id
}

export const startCheckoutAction = authActionClient
  .metadata({ actionName: 'billing.checkout' })
  .action(async ({ ctx }) => {
    if (!isBillingConfigured() || !(await isEnabled('billing.enabled'))) {
      throw new ForbiddenError('Billing is unavailable.')
    }
    const customerId = await ensureStripeCustomer(ctx.user)
    const session = await createCheckoutSession({
      customerId,
      priceId: getStripePriceId(),
      successUrl: `${BILLING_PATH}?status=success`,
      cancelUrl: `${BILLING_PATH}?status=cancel`,
    })
    if (!session.url) throw new Error('Stripe did not return a checkout URL.')
    return { url: session.url }
  })

export const openBillingPortalAction = authActionClient
  .metadata({ actionName: 'billing.portal' })
  .action(async ({ ctx }) => {
    if (!isBillingConfigured()) {
      throw new ForbiddenError('Billing is unavailable.')
    }
    const customerId = await getStripeCustomerId(ctx.user.id)
    if (!customerId) throw new ForbiddenError('No billing account yet.')
    const session = await createBillingPortalSession({
      customerId,
      returnUrl: BILLING_PATH,
    })
    return { url: session.url }
  })
