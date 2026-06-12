import 'server-only'

import { db, getReadDb, type OutboxEventStatus, schema } from '@workspace/db'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'

const { outboxEvents } = schema

/**
 * Read/replay model for the operator jobs dashboard. The outbox lives in the
 * `app` schema (read with `getReadDb`, mutated with `db`); operators are
 * authorized via PBAC at the action/page layer. Replaying resets a row to
 * `pending` with a fresh attempt budget so the outbox worker picks it up again.
 */
export interface OutboxStats {
  pending: number
  failed: number
  dead: number
  processed: number
}

/** A failed or dead outbox row — the dead-letter queue surfaced to operators. */
export interface DeadLetterEventDTO {
  id: string
  eventType: string
  aggregateType: string
  aggregateId: string
  status: Extract<OutboxEventStatus, 'failed' | 'dead'>
  attempts: number
  maxAttempts: number
  errorMessage: string | null
  scheduledAt: string
  failedAt: string | null
  createdAt: string
}

type OutboxRow = typeof outboxEvents.$inferSelect

function toDto(row: OutboxRow): DeadLetterEventDTO {
  return {
    id: row.id,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    status: row.status as DeadLetterEventDTO['status'],
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    errorMessage: row.errorMessage,
    scheduledAt: row.scheduledAt.toISOString(),
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Count of outbox rows by status (for the dashboard tiles). */
export async function getOutboxStats(): Promise<OutboxStats> {
  const rows = await getReadDb()
    .select({ status: outboxEvents.status, value: count() })
    .from(outboxEvents)
    .groupBy(outboxEvents.status)
  const byStatus = new Map(rows.map((row) => [row.status, row.value]))
  return {
    pending: byStatus.get('pending') ?? 0,
    failed: byStatus.get('failed') ?? 0,
    dead: byStatus.get('dead') ?? 0,
    processed: byStatus.get('processed') ?? 0,
  }
}

/**
 * Failed (still retrying) and dead (exhausted) outbox rows, most recent failure
 * first. This is the dead-letter queue the operator inspects and replays.
 */
export async function listDeadLetterEvents(
  limit = 100
): Promise<DeadLetterEventDTO[]> {
  const rows = await getReadDb()
    .select()
    .from(outboxEvents)
    .where(inArray(outboxEvents.status, ['failed', 'dead']))
    .orderBy(desc(outboxEvents.failedAt))
    .limit(limit)
  return rows.map(toDto)
}

/** The reset applied when an event is queued for another delivery attempt. */
const replayPatch = () => ({
  status: 'pending' as OutboxEventStatus,
  attempts: 0,
  scheduledAt: new Date(),
  failedAt: null,
  errorMessage: null,
})

/**
 * Re-queue a single failed/dead event for delivery: reset to `pending` with a
 * fresh attempt budget and make it due now. Scoped to failed/dead rows so a
 * processed or pending row can't be disturbed.
 */
export async function replayOutboxEvent(id: string): Promise<void> {
  await db
    .update(outboxEvents)
    .set(replayPatch())
    .where(
      and(
        eq(outboxEvents.id, id),
        inArray(outboxEvents.status, ['failed', 'dead'])
      )
    )
}

/** Re-queue every dead event. Returns how many rows were re-queued. */
export async function replayAllDeadEvents(): Promise<number> {
  const updated = await db
    .update(outboxEvents)
    .set(replayPatch())
    .where(eq(outboxEvents.status, 'dead'))
    .returning({ id: outboxEvents.id })
  return updated.length
}

/**
 * Permanently discard a dead event (give up on it). Only dead rows can be
 * discarded. DELETE on `app.outbox_events` is revoked from the app role
 * (least privilege), so this goes through the SECURITY DEFINER
 * `app.discard_outbox_event` function (migration 000020) rather than a direct
 * DELETE — which would fail under the production app role.
 */
export async function discardDeadEvent(id: string): Promise<void> {
  await db.execute(sql`select app.discard_outbox_event(${id})`)
}
