import { publishEvent } from '@workspace/db'

import { env } from '@/env'
import { verifyStripeSignature } from '@/lib/billing/webhook'
import { reportError } from '@/lib/observability'

/**
 * Stripe webhook endpoint. Verifies the signature, then routes the event through
 * the transactional outbox (keyed by the Stripe event id) and returns fast —
 * processing happens reliably in the outbox relay, decoupled from the HTTP ack.
 * Re-deliveries dedupe on the idempotency key.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StripeEventEnvelope {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

export async function POST(request: Request): Promise<Response> {
  const secret = env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return new Response('Billing webhook not configured', { status: 503 })
  }

  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!verifyStripeSignature(payload, signature, secret)) {
    return new Response('Invalid signature', { status: 400 })
  }

  let event: StripeEventEnvelope
  try {
    event = JSON.parse(payload) as StripeEventEnvelope
  } catch {
    return new Response('Invalid payload', { status: 400 })
  }

  try {
    await publishEvent(
      {
        type: 'billing.webhook',
        stripeEventId: event.id,
        stripeEventType: event.type,
        object: event.data.object,
      },
      { idempotencyKey: event.id }
    )
  } catch (error) {
    reportError(error, { scope: 'stripe-webhook', stripeEventId: event.id })
    return new Response('Failed to enqueue event', { status: 500 })
  }

  return Response.json({ received: true })
}
