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

/** Max rows claimed per poll. Exported so the worker's drain loop stays in sync. */
export const BATCH_SIZE = 20
const RETRY_BASE_MS = 5_000
const RETRY_CAP_MS = 60 * 60 * 1000

/**
 * Thrown to dead-letter an event immediately, skipping the retry budget. Use for
 * permanent failures a retry can't fix (unknown event type, un-narrowable
 * payload). Handlers may throw it too for their own permanent errors.
 */
export class PermanentEventError extends Error {
  override readonly name = 'PermanentEventError'
}

/** Exponential back-off for the next retry: 5s, 10s, 20s … capped at 1h. */
function nextRetryAt(attempts: number): Date {
  const delay = Math.min(RETRY_BASE_MS * 2 ** (attempts - 1), RETRY_CAP_MS)
  return new Date(Date.now() + delay)
}

const isDue = () =>
  and(
    inArray(outboxEvents.status, ['pending', 'failed']),
    lte(outboxEvents.scheduledAt, new Date())
  )

/**
 * Process one due outbox event in its own short transaction. The row is claimed
 * under `FOR UPDATE SKIP LOCKED` (so concurrent workers never double-process and
 * a long handler can't block the rest of the batch), dispatched to its handler,
 * then marked `processed`, or `failed`/`dead` with back-off on error. Returns
 * `false` when the row was already claimed or no longer due. Side effects are
 * at-least-once (handlers must be idempotent); a crash before commit replays it.
 */
async function processOne(id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(outboxEvents)
      .where(and(eq(outboxEvents.id, id), isDue()))
      .limit(1)
      .for('update', { skipLocked: true })
    if (!row) return false

    const handler = eventHandlers[row.eventType as DomainEventType] as
      | ((event: DomainEvent) => Promise<void>)
      | undefined
    try {
      await withSpan(
        'outbox.dispatch',
        async () => {
          if (!handler) {
            // Unknown type can never succeed — fail fast instead of retrying ~1h.
            throw new PermanentEventError(
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
      const dead =
        error instanceof PermanentEventError || attempts >= row.maxAttempts
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
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        .where(eq(outboxEvents.id, row.id))
    }
    return true
  })
}

/**
 * Claim and process one batch of due outbox events, returning the number
 * handled. Due ids are listed WITHOUT a lock, then each is claimed + processed
 * in its own transaction (`processOne`) — so handler I/O never holds a lock
 * across the whole batch and one failure can't roll back the others. Safe to run
 * as multiple instances (`FOR UPDATE SKIP LOCKED` per row).
 */
export async function processOutboxBatch(): Promise<number> {
  const due = await db
    .select({ id: outboxEvents.id })
    .from(outboxEvents)
    .where(isDue())
    .orderBy(asc(outboxEvents.scheduledAt))
    .limit(BATCH_SIZE)

  // No span when idle — the worker polls frequently and most polls are empty.
  if (due.length === 0) return 0

  return withSpan(
    'outbox.batch',
    async () => {
      let processed = 0
      for (const { id } of due) {
        if (await processOne(id)) processed++
      }
      logger.debug({ count: processed }, '[outbox] processed batch')
      return processed
    },
    { 'outbox.batch_size': due.length }
  )
}
