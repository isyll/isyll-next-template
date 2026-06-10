import 'server-only'

import { db } from '@workspace/db'
import { sql } from 'drizzle-orm'

import { env } from '@/env'
import { logger } from '@/lib/logger'

/** Queue name for the scheduled retention sweep. */
export const RETENTION_QUEUE = 'retention.prune'

/**
 * Prune aged audit rows and processed outbox events, with windows from env. The
 * `app` role lacks direct DELETE rights, so deletes run through the SECURITY
 * DEFINER prune functions (see migrations 000017 / 000020); `dead` rows are kept.
 */
export async function runRetention(): Promise<void> {
  const audit = await db.execute<{ removed: string }>(
    sql`select app.prune_audit_logs(make_interval(days => ${env.AUDIT_RETENTION_DAYS})) as removed`
  )
  const outbox = await db.execute<{ removed: string }>(
    sql`select app.prune_outbox_events(make_interval(days => ${env.OUTBOX_RETENTION_DAYS})) as removed`
  )
  logger.info(
    {
      auditRemoved: Number(audit.rows[0]?.removed ?? 0),
      outboxRemoved: Number(outbox.rows[0]?.removed ?? 0),
      auditRetentionDays: env.AUDIT_RETENTION_DAYS,
      outboxRetentionDays: env.OUTBOX_RETENTION_DAYS,
    },
    '[retention] prune complete'
  )
}
