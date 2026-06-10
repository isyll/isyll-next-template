import { getDb } from '../client'
import { outboxEvents, type NewOutboxEvent } from '../schema/events'

/**
 * Typed domain-event catalogue.
 *
 * A domain event is a fact that already happened, named '{aggregate}.{verb}'.
 * `publishEvent(event)` writes it to `app.outbox_events`; the outbox relay
 * (`apps/web/server/workers/outbox-worker.ts`) later dispatches it to handlers
 * registered in `apps/web/server/events`.
 *
 * Publish INSIDE a `withTransaction(...)` block so the event commits atomically
 * with the domain change — if the transaction rolls back, so does the event.
 * Outside a transaction the event is written with the base client (best effort,
 * used for events emitted from BetterAuth hooks that manage their own write).
 *
 * To add an event: add a variant to `DomainEvent`, publish it from the relevant
 * mutation, and register a handler in `apps/web/server/events/handlers.ts`.
 */
export interface UserRegisteredEvent {
  type: 'user.registered'
  userId: string
  email: string
  name: string
}

export interface UserNewConnectionEvent {
  type: 'user.new_connection'
  userId: string
  email: string
  name: string
  ipAddress: string | null
  userAgent: string | null
  /** ISO 8601 timestamp. */
  detectedAt: string
}

export interface FeatureFlagChangedEvent {
  type: 'feature_flag.changed'
  /** The flag key whose configuration changed. */
  key: string
  /** The flag's kill-switch state after the change. */
  enabled: boolean
  change: 'created' | 'updated' | 'deleted'
  /** Operator/user/system id that made the change, if known. */
  actorId: string | null
}

export type DomainEvent =
  | UserRegisteredEvent
  | UserNewConnectionEvent
  | FeatureFlagChangedEvent

export type DomainEventType = DomainEvent['type']

/**
 * The aggregate a domain event is "about" — the primary entity it concerns.
 * Exhaustive over `DomainEvent`, so adding a variant forces a mapping here.
 */
function aggregateRef(event: DomainEvent): { id: string; type: string } {
  switch (event.type) {
    case 'user.registered':
    case 'user.new_connection':
      return { id: event.userId, type: 'user' }
    case 'feature_flag.changed':
      return { id: event.key, type: 'feature_flag' }
  }
}

/** Map a domain event to its outbox-row representation. */
export function buildOutboxEvent(event: DomainEvent): NewOutboxEvent {
  const aggregate = aggregateRef(event)
  return {
    eventType: event.type,
    aggregateId: aggregate.id,
    aggregateType: aggregate.type,
    payload: event as unknown as Record<string, unknown>,
  }
}

/**
 * Publish a domain event to the transactional outbox. Joins the ambient
 * transaction when called inside `withTransaction`, so it commits atomically
 * with the surrounding domain change.
 */
export async function publishEvent(event: DomainEvent): Promise<void> {
  await getDb().insert(outboxEvents).values(buildOutboxEvent(event))
}
