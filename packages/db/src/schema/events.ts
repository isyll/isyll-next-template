import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { appSchema } from './auth'

/**
 * Transactional outbox for reliable domain-event delivery.
 *
 * 1. A mutation writes an outbox row IN THE SAME TRANSACTION as its domain
 *    change (via `publishEvent`). Atomicity guarantees the event is never lost
 *    and never "phantom-fires" on rollback.
 * 2. The outbox relay (`apps/web/server/workers/outbox-worker.ts`) polls due
 *    rows with `FOR UPDATE SKIP LOCKED`, runs the registered handler, and marks
 *    the row `processed`. On failure it reschedules with exponential back-off;
 *    after `max_attempts` the row is marked `dead` for inspection.
 *
 * The relay and handlers are plain Postgres + in-process code — no broker. See
 * `packages/db/src/lib/events.ts` (publisher) and `apps/web/server/events`.
 */
export type OutboxEventStatus = 'pending' | 'processed' | 'failed' | 'dead'

export const outboxEvents = appSchema.table(
  'outbox_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    /** What happened. Convention: '{aggregate}.{verb}' (e.g. 'user.registered'). */
    eventType: text('event_type').notNull(),

    /** The primary entity involved (e.g. a user ID). */
    aggregateId: text('aggregate_id').notNull(),
    aggregateType: text('aggregate_type').notNull().default('unknown'),

    /** Structured event data. Shape is the matching `DomainEvent` variant. */
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    /** State machine: pending → processed | failed → … → dead (no in-flight state). */
    status: text('status')
      .$type<OutboxEventStatus>()
      .notNull()
      .default('pending'),

    attempts: smallint('attempts').notNull().default(0),
    maxAttempts: smallint('max_attempts').notNull().default(5),

    /** Optional publisher-set key for at-most-once publishing (deduplication). */
    idempotencyKey: text('idempotency_key').unique(),

    /** When the row becomes due. Bumped forward on each retry (back-off). */
    scheduledAt: timestamp('scheduled_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    processedAt: timestamp('processed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Relay query: due rows in schedule order, skipping locked rows.
    index('outbox_events_due_idx')
      .on(table.scheduledAt)
      .where(sql`${table.status} in ('pending', 'failed')`),
    // Look up all events for an aggregate (observability).
    index('outbox_events_aggregate_idx').on(
      table.aggregateType,
      table.aggregateId
    ),
    // Retention prune predicate (the due index only covers pending/failed).
    index('outbox_events_processed_at_idx')
      .on(table.processedAt)
      .where(sql`${table.status} = 'processed'`),
  ]
)

export type OutboxEvent = typeof outboxEvents.$inferSelect
export type NewOutboxEvent = typeof outboxEvents.$inferInsert
