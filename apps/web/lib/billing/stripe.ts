import 'server-only'

import { env } from '@/env'

/**
 * Minimal Stripe client over the REST API (no SDK dependency) — the billing
 * "seam". Swap this module to change providers; the DAL/actions/UI stay put.
 * Server-only: it carries the secret key. Webhook verification lives in
 * `./webhook`.
 */
const STRIPE_API_BASE = 'https://api.stripe.com/v1'

/** Whether checkout is fully configured (secret key + a price to sell). */
export function isBillingConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID)
}

function requireSecret(): string {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.')
  return env.STRIPE_SECRET_KEY
}

/** The price id checkout sells; throws if unset. */
export function getStripePriceId(): string {
  if (!env.STRIPE_PRICE_ID) throw new Error('STRIPE_PRICE_ID is not set.')
  return env.STRIPE_PRICE_ID
}

async function stripePost<T>(
  path: string,
  params: URLSearchParams
): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireSecret()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const json = (await response.json()) as T & {
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(
      json.error?.message ?? `Stripe error (${String(response.status)})`
    )
  }
  return json
}

/** Create a Stripe customer for a user. */
export function createStripeCustomer(input: {
  email: string
  name?: string
  userId: string
}): Promise<{ id: string }> {
  const params = new URLSearchParams()
  params.set('email', input.email)
  if (input.name) params.set('name', input.name)
  params.set('metadata[userId]', input.userId)
  return stripePost<{ id: string }>('customers', params)
}

/** Create a subscription Checkout Session; returns the hosted-page URL. */
export function createCheckoutSession(input: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
}): Promise<{ id: string; url: string | null }> {
  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('customer', input.customerId)
  params.set('line_items[0][price]', input.priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('success_url', input.successUrl)
  params.set('cancel_url', input.cancelUrl)
  return stripePost('checkout/sessions', params)
}

/** Create a Billing Portal session; returns the hosted-page URL. */
export function createBillingPortalSession(input: {
  customerId: string
  returnUrl: string
}): Promise<{ url: string }> {
  const params = new URLSearchParams()
  params.set('customer', input.customerId)
  params.set('return_url', input.returnUrl)
  return stripePost<{ url: string }>('billing_portal/sessions', params)
}

/** The subset of a Stripe Subscription object the webhook handler reads. */
export interface StripeSubscriptionObject {
  id: string
  customer: string
  status: string
  cancel_at_period_end?: boolean
  current_period_end?: number
  items?: { data?: { price?: { id?: string } }[] }
}
