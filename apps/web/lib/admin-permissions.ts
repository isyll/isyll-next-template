import 'server-only'

import {
  adminDb,
  operatorRoles,
  permissions,
  rolePermissions,
} from '@workspace/db/admin'
import { eq } from 'drizzle-orm'

/**
 * Resolve the set of permission keys an operator holds through their roles.
 * Reads the PRIMARY (not a replica): authorization must never be served stale,
 * or a just-revoked permission could still grant access during replica lag.
 */
export async function getOperatorPermissions(
  operatorId: string
): Promise<Set<string>> {
  const rows = await adminDb
    .select({ key: permissions.key })
    .from(operatorRoles)
    .innerJoin(
      rolePermissions,
      eq(rolePermissions.roleId, operatorRoles.roleId)
    )
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(operatorRoles.operatorId, operatorId))
  return new Set(rows.map((row) => row.key))
}
