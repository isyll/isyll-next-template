import 'server-only'

import {
  type Paginated,
  type PaginationParams,
  paginated,
  toLimitOffset,
} from '@workspace/core'
import { db, schema } from '@workspace/db'
import { count, desc, ilike, or, type SQL } from 'drizzle-orm'

const { users } = schema

/**
 * Read model for the operator console's user management. Reads end-user data
 * from the `app` schema (operators are authorized via PBAC at the action/page
 * layer). Includes deactivated (soft-deleted) users so operators can see and
 * restore them — hence no `notDeleted` filter here.
 */
export interface AdminUserDTO {
  id: string
  name: string
  email: string
  emailVerified: boolean
  language: string
  status: 'active' | 'deactivated'
  createdAt: string
}

type UserRow = typeof users.$inferSelect

function toDto(row: UserRow): AdminUserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    language: row.language,
    status: row.deletedAt ? 'deactivated' : 'active',
    createdAt: row.createdAt.toISOString(),
  }
}

/** Paginated, optionally search-filtered (email or name) list of all users. */
export async function listUsers(
  params: PaginationParams & { search?: string }
): Promise<Paginated<AdminUserDTO>> {
  const term = params.search?.trim()
  const where: SQL | undefined = term
    ? or(ilike(users.email, `%${term}%`), ilike(users.name, `%${term}%`))
    : undefined
  const { limit, offset } = toLimitOffset(params)

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(where),
  ])

  return paginated(rows.map(toDto), totals[0]?.value ?? 0, params)
}
