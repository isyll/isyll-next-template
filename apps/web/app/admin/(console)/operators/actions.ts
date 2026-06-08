'use server'

import { revokeOperatorSessions } from '@workspace/auth'
import { ForbiddenError } from '@workspace/core'
import { adminDb, operatorRoles, operators } from '@workspace/db/admin'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { adminActionWithPermission } from '@/lib/admin-safe-action'

/**
 * Operator (admin) management actions — all require `operators.write`. Operators
 * can't change their own active status (lock-out guard). Deactivating revokes
 * the operator's live sessions immediately.
 */
export const setOperatorActiveAction = adminActionWithPermission(
  'operators.write'
)
  .metadata({ actionName: 'admin.operators.setActive' })
  .inputSchema(
    z.object({ operatorId: z.string().min(1), isActive: z.boolean() })
  )
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.operatorId === ctx.operator.id) {
      throw new ForbiddenError('You cannot change your own status.')
    }
    await adminDb
      .update(operators)
      .set({ isActive: parsedInput.isActive })
      .where(eq(operators.id, parsedInput.operatorId))
    if (!parsedInput.isActive) {
      await revokeOperatorSessions(parsedInput.operatorId)
    }
    revalidatePath('/admin/operators')
  })

const assignmentSchema = z.object({
  operatorId: z.string().min(1),
  roleId: z.uuid(),
})

export const assignRoleAction = adminActionWithPermission('operators.write')
  .metadata({ actionName: 'admin.operators.assignRole' })
  .inputSchema(assignmentSchema)
  .action(async ({ parsedInput }) => {
    await adminDb
      .insert(operatorRoles)
      .values(parsedInput)
      .onConflictDoNothing()
    revalidatePath('/admin/operators')
  })

export const removeRoleAction = adminActionWithPermission('operators.write')
  .metadata({ actionName: 'admin.operators.removeRole' })
  .inputSchema(assignmentSchema)
  .action(async ({ parsedInput }) => {
    await adminDb
      .delete(operatorRoles)
      .where(
        and(
          eq(operatorRoles.operatorId, parsedInput.operatorId),
          eq(operatorRoles.roleId, parsedInput.roleId)
        )
      )
    revalidatePath('/admin/operators')
  })
