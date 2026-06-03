import 'server-only'

import {
  adminDb,
  operatorRole,
  permission,
  rolePermission,
} from '@workspace/db/admin'
import { eq } from 'drizzle-orm'

/** Resolve the set of permission keys an operator holds through their roles. */
export async function getOperatorPermissions(
  operatorId: string
): Promise<Set<string>> {
  const rows = await adminDb
    .select({ key: permission.key })
    .from(operatorRole)
    .innerJoin(rolePermission, eq(rolePermission.roleId, operatorRole.roleId))
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(eq(operatorRole.operatorId, operatorId))
  return new Set(rows.map((row) => row.key))
}
