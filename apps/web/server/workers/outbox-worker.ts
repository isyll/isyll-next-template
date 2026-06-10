import { logger } from '@/lib/logger'
import { reportError } from '@/lib/observability'
import {
  shutdownTracing,
  startTracing,
} from '@/server/observability/otel-bootstrap'
import { processOutboxBatch } from '@/server/events/dispatch'

/**
 * Outbox relay worker. Long-lived process that polls `app.outbox_events` and
 * dispatches due events to their handlers (see `../events`). Run it as a
 * separate process from the web server, e.g.:
 *
 *   pnpm --filter web worker:outbox
 *
 * It keeps draining while a batch is full (catch-up after downtime), then idles
 * for `POLL_INTERVAL_MS`. Multiple instances can run concurrently — claiming
 * uses `FOR UPDATE SKIP LOCKED`. Shuts down cleanly on SIGINT/SIGTERM.
 */
const POLL_INTERVAL_MS = 2_000
const FULL_BATCH = 20

const controller = new AbortController()

/** Read the abort flag through a function so it isn't narrowed to a literal. */
function isRunning(): boolean {
  return !controller.signal.aborted
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loop(): Promise<void> {
  logger.info('[outbox] worker started')
  while (isRunning()) {
    try {
      // Drain back-to-back full batches, then idle until the next tick.
      let processed = 0
      do {
        processed = await processOutboxBatch()
      } while (isRunning() && processed >= FULL_BATCH)
    } catch (error) {
      reportError(error, { scope: 'outbox-worker' })
    }
    if (isRunning()) await sleep(POLL_INTERVAL_MS)
  }
  logger.info('[outbox] worker stopped')
}

function shutdown(reason: string): void {
  logger.info({ signal: reason }, '[outbox] shutting down')
  controller.abort()
  void shutdownTracing()
}

process.on('SIGINT', () => {
  shutdown('SIGINT')
})
process.on('SIGTERM', () => {
  shutdown('SIGTERM')
})

// Register the OTLP tracer provider (no-op unless OTEL_EXPORTER_OTLP_ENDPOINT is
// set) before the loop creates any spans.
startTracing('outbox')
void loop()
