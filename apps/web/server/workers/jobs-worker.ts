import { env } from '@/env'
import { ensureQueue, schedule, stopJobs, work } from '@/lib/jobs'
import { logger } from '@/lib/logger'
import { reportError } from '@/lib/observability'
import { withSpan } from '@/lib/otel'
import {
  shutdownTracing,
  startTracing,
} from '@/server/observability/otel-bootstrap'
import { RETENTION_QUEUE, runRetention } from '@/server/jobs/retention'

/**
 * Scheduled-jobs worker. Long-lived process that runs pg-boss cron jobs — today
 * the retention sweep (prune aged audit rows + processed outbox events). Run it
 * as a separate process from the web server:
 *
 *   pnpm --filter web worker:jobs
 *
 * pg-boss schedules persist in its own schema and are idempotent by queue name,
 * so restarts simply re-apply them. Shuts down cleanly on SIGINT/SIGTERM.
 */
async function main(): Promise<void> {
  startTracing('jobs')
  await ensureQueue(RETENTION_QUEUE)
  await work<Record<string, unknown>>(RETENTION_QUEUE, async () => {
    try {
      await withSpan('job.run', () => runRetention(), {
        'job.queue': RETENTION_QUEUE,
      })
    } catch (error) {
      reportError(error, { scope: 'jobs-worker', job: RETENTION_QUEUE })
      throw error // surface to pg-boss so it records/retries the failure
    }
  })
  await schedule(RETENTION_QUEUE, env.RETENTION_CRON)
  logger.info({ cron: env.RETENTION_CRON }, '[jobs] worker started')
}

let shuttingDown = false

async function shutdown(reason: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal: reason }, '[jobs] shutting down')
  await stopJobs()
  await shutdownTracing()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

void main().catch((error: unknown) => {
  reportError(error, { scope: 'jobs-worker' })
  process.exit(1)
})
