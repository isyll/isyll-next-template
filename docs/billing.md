# Billing (Stripe)

Subscription billing behind a thin **seam**: a fetch-based Stripe client (no SDK
dependency), local `billing_customers` / `subscriptions` mirror tables kept in
sync by **webhooks routed through the outbox**, a checkout flow, and a
self-service billing portal. It is **env-gated** — absent keys disable billing —
and additionally gated by the `billing.enabled` feature flag for gradual rollout.

## Setup

```bash
# .env (test mode in dev)
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PRICE_ID=price_…           # the recurring price checkout sells
STRIPE_WEBHOOK_SECRET=whsec_…     # from `stripe listen` or the dashboard

# enable the feature (gradual rollout via flags)
pnpm --filter web flags sync && pnpm --filter web flags enable billing.enabled

# forward webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The billing page lives at `/dashboard/billing`.

## How it works

```text
Checkout:  /dashboard/billing → startCheckoutAction → ensure Stripe customer
           → Checkout Session → redirect to Stripe → back to /dashboard/billing

Webhook:   Stripe → POST /api/webhooks/stripe → verify signature
           → publishEvent('billing.webhook', { idempotencyKey: evt.id })  (fast 200)
           → outbox relay → onBillingWebhook → upsert subscriptions mirror
```

- **Reliability.** The webhook endpoint only verifies the signature and writes
  one outbox row (deduped on the Stripe event id), then returns `200`
  immediately. The [outbox relay](./events.md) processes it with retries — so a
  slow handler or transient DB error never makes Stripe think delivery failed,
  and a re-delivered event is processed at most once.
- **Signature check.** `verifyStripeSignature` (`lib/billing/webhook.ts`)
  re-implements Stripe's HMAC-SHA256 scheme with `node:crypto` — constant-time,
  no SDK. Unit-tested.
- **Source of truth.** Stripe owns billing state; `app.subscriptions` is a local
  read-mirror for fast access checks. `getActiveSubscription(userId)` returns the
  user's access-granting subscription.
- **Portal.** `openBillingPortalAction` creates a Stripe Billing Portal session
  so users manage payment methods, invoices and cancellation on Stripe.

## Swapping providers

Billing is reached only through `lib/billing/stripe.ts` (the API calls) and the
`onBillingWebhook` handler (state sync). Re-implement those two against another
provider and the tables, DAL, actions and UI are unchanged.

## Gating a paid feature

```ts
import { getActiveSubscription } from '@/features/billing/queries'

const subscription = await getActiveSubscription(userId)
const isPro = subscription !== null
```
