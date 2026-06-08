'use server'

import { revokeUserSessions } from '@workspace/auth'
import { db, restorePatch, schema, softDeletePatch } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { adminActionWithPermission } from '@/lib/admin-safe-action'

/**
 * Operator actions on end users. All require the `users.write` permission and
 * run through the admin action client (operator session + PBAC + error
 * reporting). Deactivating soft-deletes the user (sign-in is then blocked by the
 * session hook) and revokes their live sessions.
 */
const userIdSchema = z.object({ userId: z.string().min(1) })

export const deactivateUserAction = adminActionWithPermission('users.write')
  .metadata({ actionName: 'admin.users.deactivate' })
  .inputSchema(userIdSchema)
  .action(async ({ parsedInput }) => {
    await db
      .update(schema.users)
      .set(softDeletePatch())
      .where(eq(schema.users.id, parsedInput.userId))
    await revokeUserSessions(parsedInput.userId)
    revalidatePath('/admin/users')
  })

export const reactivateUserAction = adminActionWithPermission('users.write')
  .metadata({ actionName: 'admin.users.reactivate' })
  .inputSchema(userIdSchema)
  .action(async ({ parsedInput }) => {
    await db
      .update(schema.users)
      .set(restorePatch())
      .where(eq(schema.users.id, parsedInput.userId))
    revalidatePath('/admin/users')
  })

export const forceLogoutUserAction = adminActionWithPermission('users.write')
  .metadata({ actionName: 'admin.users.forceLogout' })
  .inputSchema(userIdSchema)
  .action(async ({ parsedInput }) => {
    await revokeUserSessions(parsedInput.userId)
    revalidatePath('/admin/users')
  })
