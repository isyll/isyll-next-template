'use server'

import { ConflictError, ForbiddenError } from '@workspace/core'
import { softDeletePatch } from '@workspace/db'
import { adminDb, rolePermissions, roles } from '@workspace/db/admin'
import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { adminActionWithPermission } from '@/lib/admin-safe-action'

/**
 * Role + permission management actions — all require `roles.write`. Permissions
 * themselves are a fixed catalogue (`@workspace/auth/permissions`); roles are
 * dynamic and grant subsets of those permissions. System roles are protected.
 */
export const createRoleAction = adminActionWithPermission('roles.write')
  .metadata({ actionName: 'admin.roles.create' })
  .inputSchema(
    z.object({
      name: z.string().trim().min(1).max(64),
      description: z.string().trim().max(256).optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    // Names are unique among live roles (partial unique index, deleted_at IS
    // NULL). Target that predicate so an inserted-then-soft-deleted name can be
    // reused, and surface a ConflictError when an ACTIVE role already owns it
    // (a bare onConflictDoNothing would silently no-op and confuse the operator).
    const [created] = await adminDb
      .insert(roles)
      .values({
        name: parsedInput.name,
        description: parsedInput.description ?? null,
      })
      .onConflictDoNothing({
        target: roles.name,
        where: sql`deleted_at is null`,
      })
      .returning({ id: roles.id })
    if (!created) {
      throw new ConflictError('A role with this name already exists.')
    }
    revalidatePath('/admin/roles')
  })

export const setRolePermissionAction = adminActionWithPermission('roles.write')
  .metadata({ actionName: 'admin.roles.setPermission' })
  .inputSchema(
    z.object({
      roleId: z.uuid(),
      permissionId: z.uuid(),
      granted: z.boolean(),
    })
  )
  .action(async ({ parsedInput }) => {
    if (parsedInput.granted) {
      await adminDb
        .insert(rolePermissions)
        .values({
          roleId: parsedInput.roleId,
          permissionId: parsedInput.permissionId,
        })
        .onConflictDoNothing()
    } else {
      await adminDb
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, parsedInput.roleId),
            eq(rolePermissions.permissionId, parsedInput.permissionId)
          )
        )
    }
    revalidatePath('/admin/roles')
  })

export const deleteRoleAction = adminActionWithPermission('roles.write')
  .metadata({ actionName: 'admin.roles.delete' })
  .inputSchema(z.object({ roleId: z.uuid() }))
  .action(async ({ parsedInput }) => {
    const [role] = await adminDb
      .select({ isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.id, parsedInput.roleId))
      .limit(1)
    if (role?.isSystem) {
      throw new ForbiddenError('System roles cannot be deleted.')
    }
    await adminDb
      .update(roles)
      .set(softDeletePatch())
      .where(eq(roles.id, parsedInput.roleId))
    revalidatePath('/admin/roles')
  })
