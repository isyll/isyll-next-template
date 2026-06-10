import 'server-only'

import {
  db,
  type DomainEvent,
  type DomainEventType,
  schema,
} from '@workspace/db'
import { and, asc, eq, inArray, lte } from 'drizzle-orm'

import { logger } from '@/lib/logger'
import { reportError } from '@/lib/observability'
import { withSpan } from '@/lib/otel'

import { eventHandlers } from './handlers'

const { outboxEvents } = schema

const BATCH_SIZE = 20
const RETRY_BASE_MS = 5_000
const RETRY_CAP_MS = 60 * 60 * 1000

/** Exponential back-off for the next retry: 5s, 10s, 20s … capped at 1h. */
function nextRetryAt(attempts: number): Date {
  const delay = Math.min(RETRY_BASE_MS * 2 ** (attempts - 1), RETRY_CAP_MS)
  return new Date(Date.now() + delay)
}

/**
 * Claim and process one batch of due outbox events, returning the number
 * handled. `FOR UPDATE SKIP LOCKED` lets multiple worker instances run safely
 * without processing the same row twice. Each event is dispatched to its
 * handler; success marks the row `processed`, failure reschedules it with
 * back-off and, after `max_attempts`, marks it `dead`.
 */
export async function processOutboxBatch(): Promise<number> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(outboxEvents)
      .where(
        and(
          inArray(outboxEvents.status, ['pending', 'failed']),
          lte(outboxEvents.scheduledAt, new Date())
        )
      )
      .orderBy(asc(outboxEvents.scheduledAt))
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true })

    // No span when idle — the worker polls frequently and most polls are empty.
    if (due.length === 0) return 0

    return withSpan(
      'outbox.batch',
      async () => {
        for (const row of due) {
          const handler = eventHandlers[row.eventType as DomainEventType] as
            | ((event: DomainEvent) => Promise<void>)
            | undefined
          try {
            await withSpan(
              'outbox.dispatch',
              async () => {
                if (!handler) {
                  throw new Error(
                    `No handler for event type "${row.eventType}"`
                  )
                }
                await handler(row.payload as unknown as DomainEvent)
              },
              {
                'event.type': row.eventType,
                'event.id': row.id,
                'event.attempts': row.attempts,
              }
            )
            await tx
              .update(outboxEvents)
              .set({
                status: 'processed',
                processedAt: new Date(),
                errorMessage: null,
              })
              .where(eq(outboxEvents.id, row.id))
          } catch (error) {
            const attempts = row.attempts + 1
            const dead = attempts >= row.maxAttempts
            reportError(error, {
              scope: 'outbox',
              eventType: row.eventType,
              eventId: row.id,
              attempts,
            })
            await tx
              .update(outboxEvents)
              .set({
                status: dead ? 'dead' : 'failed',
                attempts,
                failedAt: new Date(),
                scheduledAt: dead ? row.scheduledAt : nextRetryAt(attempts),
                errorMessage:
                  error instanceof Error ? error.message : String(error),
              })
              .where(eq(outboxEvents.id, row.id))
          }
        }

        logger.debug({ count: due.length }, '[outbox] processed batch')
        return due.length
      },
      { 'outbox.batch_size': due.length }
    )
  })
}
