import 'server-only'

import { resolveLocale } from '@workspace/core'
import type {
  BillingWebhookEvent,
  DomainEvent,
  DomainEventType,
  FeatureFlagChangedEvent,
  UserNewConnectionEvent,
  UserRegisteredEvent,
} from '@workspace/db'
import { sendNewConnectionAlert } from '@workspace/email'

import {
  getUserIdByStripeCustomer,
  upsertSubscription,
} from '@/features/billing/queries'
import { deliverNotification } from '@/features/notifications/service'
import type { StripeSubscriptionObject } from '@/lib/billing/stripe'
import { cacheTags, invalidateTags } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { siteConfig } from '@/lib/site-config'

/**
 * Domain-event handlers. Each handler reacts to one event type and must be
 * IDEMPOTENT — the outbox delivers at-least-once, so a handler can run twice
 * (e.g. after a crash between side effect and "processed"). Keep handlers fast;
 * for slow/expensive work, enqueue a background job (`@/lib/jobs`) here instead
 * of doing it inline.
 */

/** A new user finished signing up → drop them a welcome notification. */
async function onUserRegistered(event: UserRegisteredEvent): Promise<void> {
  await deliverNotification({
    userId: event.userId,
    type: 'welcome',
    // Idempotent: at-least-once delivery + a replay must not double-welcome.
    dedupeKey: 'welcome',
    // The app is single-locale today; localize via the user's `language` when
    // adding locales (handlers run outside a request, so use a server lookup).
    title: `Bienvenue sur ${siteConfig.name} !`,
    body: 'Votre compte est prêt. Explorez votre tableau de bord pour commencer.',
    data: { email: event.email },
  })
}

/**
 * Example handler (not published by default): a new sign-in was detected →
 * email the user a security alert. Publish `user.new_connection` from your
 * login/device-tracking logic to enable it.
 */
async function onUserNewConnection(
  event: UserNewConnectionEvent
): Promise<void> {
  await sendNewConnectionAlert(event.email, {
    name: event.name,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    detectedAt: event.detectedAt,
    securityUrl: `${siteConfig.url}/dashboard/security`,
    appName: siteConfig.name,
    locale: resolveLocale(undefined),
  })
}

/**
 * A feature flag's configuration changed → record a structured rollout-metric
 * line. Because the event is written transactionally with the change and
 * delivered at-least-once, this is a durable audit/rollout trail (which flag
 * flipped, by whom, when) that pairs cleanly with log-based metrics.
 */
function onFeatureFlagChanged(event: FeatureFlagChangedEvent): Promise<void> {
  logger.info(
    {
      scope: 'feature-flags',
      flag: event.key,
      change: event.change,
      enabled: event.enabled,
      actorId: event.actorId,
    },
    '[feature-flags] configuration changed'
  )
  return Promise.resolve()
}

/**
 * A Stripe webhook (delivered via the outbox) → keep the local subscription
 * mirror in sync. Only subscription-lifecycle events are handled; others are
 * ignored. Idempotent: the outbox dedupes on the Stripe event id, and the
 * upsert is safe to repeat.
 */
async function onBillingWebhook(event: BillingWebhookEvent): Promise<void> {
  if (!event.stripeEventType.startsWith('customer.subscription.')) return

  const subscription = event.object as unknown as StripeSubscriptionObject
  const userId = await getUserIdByStripeCustomer(subscription.customer)
  if (!userId) {
    logger.warn(
      { scope: 'billing', stripeEventId: event.stripeEventId },
      '[billing] webhook for an unknown Stripe customer'
    )
    return
  }

  await upsertSubscription({
    id: subscription.id,
    userId,
    stripeCustomerId: subscription.customer,
    status: subscription.status,
    priceId: subscription.items?.data?.[0]?.price?.id ?? null,
    currentPeriodEnd:
      typeof subscription.current_period_end === 'number'
        ? new Date(subscription.current_period_end * 1000)
        : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  })

  // The subscription mirror just changed → drop the user's cached billing reads
  // so every instance reflects the new state immediately, not on TTL expiry.
  await invalidateTags(cacheTags.userBilling(userId))

  if (event.stripeEventType === 'customer.subscription.created') {
    await deliverNotification({
      userId,
      type: 'billing.subscribed',
      // Idempotent per subscription: a webhook replay won't re-notify.
      dedupeKey: `billing.subscribed:${subscription.id}`,
      title: `Abonnement activé`,
      body: 'Merci ! Votre abonnement est désormais actif.',
      data: { subscriptionId: subscription.id },
    })
  }
}

/**
 * Registry of handlers, one per event type. The dispatcher narrows the stored
 * payload to the matching `DomainEvent` variant before calling.
 */
export const eventHandlers: Record<
  DomainEventType,
  (event: DomainEvent) => Promise<void>
> = {
  'user.registered': (event) => onUserRegistered(event as UserRegisteredEvent),
  'user.new_connection': (event) =>
    onUserNewConnection(event as UserNewConnectionEvent),
  'feature_flag.changed': (event) =>
    onFeatureFlagChanged(event as FeatureFlagChangedEvent),
  'billing.webhook': (event) => onBillingWebhook(event as BillingWebhookEvent),
}
