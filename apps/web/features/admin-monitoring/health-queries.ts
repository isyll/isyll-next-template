import 'server-only'

import { db, getReadDb, schema } from '@workspace/db'
import { desc, gte, sql } from 'drizzle-orm'

import { getOutboxStats, type OutboxStats } from '@/features/admin-jobs/queries'
import { listQueueStates, type QueueState } from '@/lib/jobs'
import { getRedis } from '@/lib/redis'

const { auditLogs } = schema

/**
 * Operator system-health read model. Everything here is read from data the
 * stack already holds (Postgres, Redis, the outbox, pg-boss, the audit log) so
 * the monitoring dashboard is useful WITHOUT any external/paid service — Sentry
 * is an optional add-on, not a prerequisite.
 */
export type HealthStatus = 'ok' | 'degraded' | 'down' | 'unconfigured'

export interface ProbeResult {
  status: HealthStatus
  latencyMs: number | null
}

const SLOW_PROBE_MS = 500

async function probe(run: () => Promise<unknown>): Promise<ProbeResult> {
  const start = performance.now()
  try {
    await run()
    const latencyMs = Math.round(performance.now() - start)
    return { status: latencyMs > SLOW_PROBE_MS ? 'degraded' : 'ok', latencyMs }
  } catch {
    return { status: 'down', latencyMs: null }
  }
}

async function probeRedis(): Promise<ProbeResult> {
  const redis = getRedis()
  if (!redis) return { status: 'unconfigured', latencyMs: null }
  return probe(() => redis.ping())
}

export interface SystemHealth {
  database: ProbeResult
  readReplica: ProbeResult
  redis: ProbeResult
  outbox: OutboxStats
  queues: QueueState[]
}

/** A liveness + backlog snapshot of the core infrastructure. */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [database, readReplica, redis, outbox, queues] = await Promise.all([
    probe(() => db.execute(sql`select 1`)),
    probe(() => getReadDb().execute(sql`select 1`)),
    probeRedis(),
    getOutboxStats(),
    listQueueStates(),
  ])
  return { database, readReplica, redis, outbox, queues }
}

export interface AuditActivityEntry {
  id: string
  tableName: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  actorType: string | null
  changedColumns: string[]
  occurredAt: string
}

/** The most recent audited changes — an operator activity feed. */
export async function getRecentAuditActivity(
  limit = 10
): Promise<AuditActivityEntry[]> {
  const rows = await getReadDb()
    .select({
      id: auditLogs.id,
      tableName: auditLogs.tableName,
      operation: auditLogs.operation,
      actorType: auditLogs.actorType,
      changedColumns: auditLogs.changedColumns,
      occurredAt: auditLogs.occurredAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.occurredAt))
    .limit(limit)
  return rows.map((row) => ({
    ...row,
    occurredAt: row.occurredAt.toISOString(),
  }))
}

export interface AuditVolumePoint {
  label: string
  value: number
}

/** Daily audit-write volume over the last `days`, for a trend chart. */
export async function getAuditVolume(days = 14): Promise<AuditVolumePoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await getReadDb()
    .select({
      day: sql<string>`to_char(date_trunc('day', ${auditLogs.occurredAt}), 'MM-DD')`,
      value: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(gte(auditLogs.occurredAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`)
  return rows.map((row) => ({ label: row.day, value: row.value }))
}
