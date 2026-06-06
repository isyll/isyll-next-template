import { integer, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { appSchema } from './auth'

/**
 * Transactional outbox for reliable, exactly-once event delivery.
 *
 * Pattern overview:
 *   1. A business mutation writes an outbox_event row IN THE SAME TRANSACTION
 *      as its domain change. Atomicity guarantees the event is never lost.
 *   2. The outbox worker (`apps/web/server/workers/outbox-worker.ts`) polls
 *      pending events, publishes each to the appropriate Redis stream, and
 *      marks the row 'processed'.
 *   3. Domain consumers (email sender, notification dispatcher, …) subscribe
 *      to Redis streams and process events asynchronously.
 *   4. On failure the worker retries with exponential back-off; after
 *      `max_attempts` the row is marked 'dead' and pushed to the Redis DLQ
 *      (`dlq:{event_type}`) for manual inspection.
 *
 * Business domains MUST publish through the outbox — never call external
 * services directly from mutations. See `apps/web/lib/events.ts`.
 */

export type OutboxEventStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'dead'

export const outboxEvents = appSchema.table('outbox_events', {
  id: uuid('id').defaultRandom().primaryKey(),

  /** Identifies what happened. Convention: '{domain}.{verb}' (e.g. 'user.registered'). */
  eventType: text('event_type').notNull(),

  /** The primary entity involved (e.g. a user ID, order ID). */
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull().default('unknown'),

  /** Structured event data. Shape is defined by each EventType. */
  payload: jsonb('payload')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

  /** Processing state machine: pending → processing → processed | dead. */
  status: text('status')
    .$type<OutboxEventStatus>()
    .notNull()
    .default('pending'),

  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),

  /** Prevents duplicate processing across retries. Set by the publisher. */
  idempotencyKey: text('idempotency_key').unique(),

  /** Allows scheduling future or delayed events. */
  scheduledAt: timestamp('scheduled_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  processedAt: timestamp('processed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type OutboxEvent = typeof outboxEvents.$inferSelect
export type NewOutboxEvent = typeof outboxEvents.$inferInsert
