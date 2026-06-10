import { reportError } from '@/lib/observability'
import { runRetention } from '@/server/jobs/retention'

/**
 * One-shot retention sweep for operators — runs the same prune as the scheduled
 * job, without pg-boss. `pnpm --filter web retention:run`. Exits explicitly so
 * the open database pool doesn't keep the process alive.
 */
void runRetention()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    reportError(error, { scope: 'retention:run' })
    process.exit(1)
  })
