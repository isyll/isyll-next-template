import 'server-only'

import {
  type Paginated,
  type PaginationParams,
  paginated,
  toLimitOffset,
} from '@workspace/core'
import {
  getReadDb,
  notDeleted,
  schema,
  smartTextSearch,
  trigramMatch,
  trigramSimilarity,
} from '@workspace/db'
import { and, asc, count, desc, sql, type SQL } from 'drizzle-orm'

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

export interface UserSuggestion {
  id: string
  name: string
  email: string
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

// The generated `search_vector` column (name + email) is SQL-only — referenced
// here as a raw expression, scoped to the single-table query.
const searchVector = sql`search_vector`

/**
 * Paginated, optionally search-filtered list of all users. Search combines
 * Postgres full-text (`websearch_to_tsquery` over name + email) with a fuzzy
 * trigram arm on name, ranked by the better of the two scores.
 */
export async function listUsers(
  params: PaginationParams & { search?: string }
): Promise<Paginated<AdminUserDTO>> {
  const term = params.search?.trim()
  const search = term
    ? smartTextSearch({ vector: searchVector, trigramColumn: users.name, term })
    : null
  const where: SQL | undefined = search?.condition
  const orderBy = search
    ? [desc(search.rank), desc(users.createdAt)]
    : [desc(users.createdAt)]
  const { limit, offset } = toLimitOffset(params)

  const read = getReadDb()
  const [rows, totals] = await Promise.all([
    read
      .select()
      .from(users)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    read.select({ value: count() }).from(users).where(where),
  ])

  return paginated(rows.map(toDto), totals[0]?.value ?? 0, params)
}

/**
 * Typo-tolerant autocomplete over live users' names (pg_trgm), ranked by
 * similarity. Returns a short list suitable for a search-as-you-type box.
 */
export async function suggestUsers(
  term: string,
  limit = 8
): Promise<UserSuggestion[]> {
  const query = term.trim()
  if (query.length === 0) return []

  const rows = await getReadDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      score: trigramSimilarity(users.name, query),
    })
    .from(users)
    .where(and(notDeleted(users), trigramMatch(users.name, query)))
    .orderBy(desc(sql`score`), asc(users.name))
    .limit(limit)

  return rows.map(({ id, name, email }) => ({ id, name, email }))
}
