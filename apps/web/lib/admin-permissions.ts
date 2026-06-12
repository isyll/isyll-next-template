import 'server-only'

import { notDeleted } from '@workspace/db'
import {
  adminDb,
  operatorRoles,
  permissions,
  rolePermissions,
  roles,
} from '@workspace/db/admin'
import { and, eq } from 'drizzle-orm'

/**
 * Resolve the set of permission keys an operator holds through their roles.
 * Reads the PRIMARY (not a replica): authorization must never be served stale,
 * or a just-revoked permission could still grant access during replica lag.
 *
 * Soft-deleted roles are excluded: a deleted role keeps its row and FK edges,
 * so without this filter, re-assigning a deleted role would silently confer its
 * permissions.
 */
export async function getOperatorPermissions(
  operatorId: string
): Promise<Set<string>> {
  const rows = await adminDb
    .select({ key: permissions.key })
    .from(operatorRoles)
    .innerJoin(roles, eq(roles.id, operatorRoles.roleId))
    .innerJoin(
      rolePermissions,
      eq(rolePermissions.roleId, operatorRoles.roleId)
    )
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(operatorRoles.operatorId, operatorId), notDeleted(roles)))
  return new Set(rows.map((row) => row.key))
}
