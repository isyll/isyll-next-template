'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import {
  discardDeadEvent,
  replayAllDeadEvents,
  replayOutboxEvent,
} from '@/features/admin-jobs/queries'
import { adminActionWithPermission } from '@/lib/admin-safe-action'

/**
 * Operator actions on the dead-letter queue. All require `jobs.write` and run
 * through the admin action client (operator session + PBAC + error reporting).
 * Replaying re-queues an outbox row for the worker; discarding deletes a dead
 * row for good.
 */
const eventIdSchema = z.object({ id: z.uuid() })

export const replayOutboxEventAction = adminActionWithPermission('jobs.write')
  .metadata({ actionName: 'admin.jobs.replay' })
  .inputSchema(eventIdSchema)
  .action(async ({ parsedInput }) => {
    await replayOutboxEvent(parsedInput.id)
    revalidatePath('/admin/jobs')
  })

export const replayAllDeadEventsAction = adminActionWithPermission('jobs.write')
  .metadata({ actionName: 'admin.jobs.replayAll' })
  .action(async () => {
    const count = await replayAllDeadEvents()
    revalidatePath('/admin/jobs')
    return { count }
  })

export const discardDeadEventAction = adminActionWithPermission('jobs.write')
  .metadata({ actionName: 'admin.jobs.discard' })
  .inputSchema(eventIdSchema)
  .action(async ({ parsedInput }) => {
    await discardDeadEvent(parsedInput.id)
    revalidatePath('/admin/jobs')
  })
