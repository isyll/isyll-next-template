import 'server-only'

import { notDeleted } from '@workspace/db'
import {
  adminDb,
  operatorRoles,
  operators,
  permissions,
  rolePermissions,
  roles,
} from '@workspace/db/admin'
import { asc, eq } from 'drizzle-orm'

/**
 * Read models for operator (admin) + role/permission management. Everything
 * lives in the isolated `admin` schema and is reached through `adminDb`.
 * Authorization is enforced by PBAC at the action/page layer.
 */
export interface RoleRef {
  id: string
  name: string
}

export interface AdminOperatorDTO {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: string
  roles: RoleRef[]
}

export interface RoleDTO {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissionKeys: string[]
}

export interface PermissionDTO {
  id: string
  key: string
  description: string | null
}

export async function listOperators(): Promise<AdminOperatorDTO[]> {
  const [ops, assignments] = await Promise.all([
    adminDb
      .select()
      .from(operators)
      .where(notDeleted(operators))
      .orderBy(asc(operators.email)),
    adminDb
      .select({
        operatorId: operatorRoles.operatorId,
        id: roles.id,
        name: roles.name,
      })
      .from(operatorRoles)
      .innerJoin(roles, eq(roles.id, operatorRoles.roleId)),
  ])

  const rolesByOperator = new Map<string, RoleRef[]>()
  for (const row of assignments) {
    const list = rolesByOperator.get(row.operatorId) ?? []
    list.push({ id: row.id, name: row.name })
    rolesByOperator.set(row.operatorId, list)
  }

  return ops.map((operator) => ({
    id: operator.id,
    email: operator.email,
    name: operator.name,
    isActive: operator.isActive,
    createdAt: operator.createdAt.toISOString(),
    roles: rolesByOperator.get(operator.id) ?? [],
  }))
}

export async function listRoles(): Promise<RoleDTO[]> {
  const [roleRows, grants] = await Promise.all([
    adminDb
      .select()
      .from(roles)
      .where(notDeleted(roles))
      .orderBy(asc(roles.name)),
    adminDb
      .select({ roleId: rolePermissions.roleId, key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)),
  ])

  const keysByRole = new Map<string, string[]>()
  for (const row of grants) {
    const list = keysByRole.get(row.roleId) ?? []
    list.push(row.key)
    keysByRole.set(row.roleId, list)
  }

  return roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionKeys: keysByRole.get(role.id) ?? [],
  }))
}

export async function listPermissions(): Promise<PermissionDTO[]> {
  const rows = await adminDb
    .select()
    .from(permissions)
    .orderBy(asc(permissions.key))
  return rows.map((permission) => ({
    id: permission.id,
    key: permission.key,
    description: permission.description,
  }))
}
