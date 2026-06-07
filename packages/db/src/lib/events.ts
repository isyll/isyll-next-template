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

export type DomainEvent = UserRegisteredEvent | UserNewConnectionEvent

export type DomainEventType = DomainEvent['type']

/** Map a domain event to its outbox-row representation. */
export function buildOutboxEvent(event: DomainEvent): NewOutboxEvent {
  const [aggregateType] = event.type.split('.')
  return {
    eventType: event.type,
    // Every current aggregate is a user; widen this when adding other domains.
    aggregateId: event.userId,
    aggregateType: aggregateType ?? 'unknown',
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
