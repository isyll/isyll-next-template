import 'server-only'

import { resolveLocale } from '@workspace/core'
import type {
  DomainEvent,
  DomainEventType,
  UserNewConnectionEvent,
  UserRegisteredEvent,
} from '@workspace/db'
import { sendNewConnectionAlert } from '@workspace/email'

import { createNotification } from '@/features/notifications/queries'
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
  await createNotification({
    userId: event.userId,
    type: 'welcome',
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
}
