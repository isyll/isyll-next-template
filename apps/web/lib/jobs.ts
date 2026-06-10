import {
  PgBoss,
  type Job,
  type ScheduleOptions,
  type SendOptions,
  type WorkOptions,
} from 'pg-boss'

import { env } from '@/env'

/**
 * Background jobs backed by PostgreSQL (pg-boss) — no extra infrastructure: it
 * reuses DATABASE_URL and self-manages its own `pgboss` schema on first start.
 *
 * Server/worker only (pulls in `pg`): import from Server Actions / route
 * handlers to `enqueue`, and run `work(...)` handlers in a long-lived worker
 * process (e.g. a small `tsx` entrypoint that registers handlers and stays up).
 * Enqueue is fire-and-forget from the request path; the heavy work happens off
 * it. Keep job `data` small and serializable (it's stored as JSON).
 */
export type JobHandler<T> = (data: T, job: Job<T>) => Promise<void>

let bossPromise: Promise<PgBoss> | null = null

async function getBoss(): Promise<PgBoss> {
  bossPromise ??= (async () => {
    const boss = new PgBoss(env.DATABASE_URL)
    boss.on('error', (error: Error) => {
      console.error('[jobs] pg-boss error', error)
    })
    await boss.start()
    return boss
  })()
  return bossPromise
}

/** Create a queue if it doesn't exist (idempotent). Call once at startup. */
export async function ensureQueue(name: string): Promise<void> {
  const boss = await getBoss()
  await boss.createQueue(name)
}

/** Enqueue a job. Returns the job id (or null if deduplicated/throttled). */
export async function enqueue(
  name: string,
  data: object,
  options?: SendOptions
): Promise<string | null> {
  const boss = await getBoss()
  return options ? boss.send(name, data, options) : boss.send(name, data)
}

/**
 * Register a worker for `name`. The friendly per-job `handler` is invoked once
 * per job; pg-boss handles retries, concurrency, and backoff via `options`.
 */
export async function work<T extends object>(
  name: string,
  handler: JobHandler<T>,
  options?: WorkOptions
): Promise<string> {
  const boss = await getBoss()
  const onBatch = async (jobs: Job<T>[]): Promise<void> => {
    for (const job of jobs) {
      await handler(job.data, job)
    }
  }
  return options
    ? boss.work<T>(name, options, onBatch)
    : boss.work<T>(name, onBatch)
}

/**
 * Register (or update) a cron schedule for `name`. Idempotent by queue name —
 * safe to call on every worker boot; changing the cron + restarting updates it.
 * The queue must exist (`ensureQueue`) and a `work(name, …)` handler must be
 * running in a long-lived process to consume the scheduled jobs.
 */
export async function schedule(
  name: string,
  cron: string,
  data?: object,
  options?: ScheduleOptions
): Promise<void> {
  const boss = await getBoss()
  await boss.schedule(name, cron, data ?? {}, options)
}

/** Gracefully stop the pg-boss instance (call on worker shutdown). */
export async function stopJobs(): Promise<void> {
  const current = bossPromise
  bossPromise = null
  if (current) {
    await (await current).stop()
  }
}
