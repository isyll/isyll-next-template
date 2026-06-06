import 'server-only'

import type { NewOutboxEvent } from '@workspace/db'

/**
 * Typed domain event catalogue.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  HOW THE EVENT SYSTEM WORKS                                         │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  1. PUBLISH (in a mutation)                                         │
 * │     Call `publishEvent(event)` inside a `withTransaction` block.    │
 * │     The event is written to `app.outbox_events` atomically with     │
 * │     the domain data — if the transaction rolls back, so does the    │
 * │     event (no phantom events).                                      │
 * │                                                                     │
 * │  2. RELAY (outbox worker)                                           │
 * │     `apps/web/server/workers/outbox-worker.ts` polls pending rows,  │
 * │     pushes each payload to a Redis stream (XADD), and marks the     │
 * │     row 'processed'. On failure it retries with exponential back-   │
 * │     off; after max_attempts the row is marked 'dead' and pushed to  │
 * │     the DLQ (`dlq:{event_type}` Redis list).                        │
 * │                                                                     │
 * │  3. CONSUME (domain handlers)                                       │
 * │     Workers subscribe to Redis streams (XREADGROUP). Each handler   │
 * │     is idempotent and processes exactly one event type. Email,      │
 * │     notifications, external webhooks, and analytics all live here   │
 * │     — never inline in the mutation.                                 │
 * │                                                                     │
 * │  Adding a new event type:                                           │
 * │    a. Add it to the `DomainEvent` union below.                      │
 * │    b. Publish it via `publishEvent` in the relevant mutation.       │
 * │    c. Add a handler in the appropriate worker.                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ─── Event type catalogue ─────────────────────────────────────────────────────

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
  /** ISO 8601 timestamp */
  detectedAt: string
}

export interface UserEmailVerificationRequestedEvent {
  type: 'user.email_verification_requested'
  userId: string
  email: string
  verificationUrl: string
}

export interface UserPasswordResetRequestedEvent {
  type: 'user.password_reset_requested'
  userId: string
  email: string
  resetUrl: string
}

/** All supported domain events — extend as the system grows. */
export type DomainEvent =
  | UserRegisteredEvent
  | UserNewConnectionEvent
  | UserEmailVerificationRequestedEvent
  | UserPasswordResetRequestedEvent

export type EventType = DomainEvent['type']

// ─── Publisher ───────────────────────────────────────────────────────────────

/**
 * Build an outbox event row from a typed domain event. The row must be
 * inserted inside the same `withTransaction` call as the domain mutation.
 *
 * @example
 *   await withTransaction({ actor: { id: user.id, type: 'user' } }, async (tx) => {
 *     const user = await tx.insert(users).values(data).returning()[0]
 *     await tx.insert(outboxEvents).values(buildOutboxEvent({
 *       type: 'user.registered',
 *       userId: user.id,
 *       email: user.email,
 *       name: user.name,
 *     }))
 *   })
 */
export function buildOutboxEvent(
  event: DomainEvent
): Omit<NewOutboxEvent, 'id'> {
  const [domain] = event.type.split('.')
  return {
    eventType: event.type,
    aggregateId: getAggregateId(event),
    aggregateType: domain ?? 'unknown',
    payload: event as unknown as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    idempotencyKey: buildIdempotencyKey(event),
    scheduledAt: new Date(),
  }
}

function getAggregateId(event: DomainEvent): string {
  return event.userId
}

function buildIdempotencyKey(event: DomainEvent): string {
  // Simple deterministic key: event type + aggregate ID + timestamp bucket
  // (5-second window prevents duplicates from retried actions).
  const bucket = Math.floor(Date.now() / 5000)
  return `${event.type}:${getAggregateId(event)}:${bucket}`
}

// ─── Redis stream helpers ─────────────────────────────────────────────────────

/** Redis stream name for a given event type (e.g. 'stream:user.registered'). */
export function streamKey(eventType: EventType): string {
  return `stream:${eventType}`
}

/** Redis DLQ list name for a given event type. */
export function dlqKey(eventType: EventType): string {
  return `dlq:${eventType}`
}
