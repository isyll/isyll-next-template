import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '../client'
import { users } from '../schema/auth'
import {
  ftsMatch,
  ftsRank,
  smartTextSearch,
  trigramMatch,
  trigramSimilarity,
} from './search'

// These compile the SQL (no connection needed) and assert the shape.

describe('full-text search builders', () => {
  it('ftsMatch emits websearch_to_tsquery with bound params', () => {
    const { sql: query, params } = db
      .select()
      .from(users)
      .where(ftsMatch(sql`search_vector`, 'ada lovelace'))
      .toSQL()
    expect(query).toContain('websearch_to_tsquery')
    expect(query).toContain('@@')
    expect(params).toContain('simple')
    expect(params).toContain('ada lovelace')
  })

  it('ftsRank uses ts_rank for ordering', () => {
    const { sql: query } = db
      .select({ rank: ftsRank(sql`search_vector`, 'x') })
      .from(users)
      .toSQL()
    expect(query).toContain('ts_rank')
  })

  it('honours a non-default text-search config', () => {
    const { params } = db
      .select()
      .from(users)
      .where(ftsMatch(sql`search_vector`, 'bonjour', 'french'))
      .toSQL()
    expect(params).toContain('french')
  })
})

describe('trigram search builders', () => {
  it('trigramMatch uses the % operator', () => {
    const { sql: query, params } = db
      .select()
      .from(users)
      .where(trigramMatch(users.name, 'jon'))
      .toSQL()
    expect(query).toContain('%')
    expect(params).toContain('jon')
  })

  it('trigramSimilarity uses similarity()', () => {
    const { sql: query } = db
      .select({ score: trigramSimilarity(users.name, 'jon') })
      .from(users)
      .toSQL()
    expect(query).toContain('similarity')
  })
})

describe('smartTextSearch', () => {
  it('ORs the full-text and trigram arms and ranks by the greatest score', () => {
    const search = smartTextSearch({
      vector: sql`search_vector`,
      trigramColumn: users.name,
      term: 'ada',
    })
    const { sql: query } = db
      .select()
      .from(users)
      .where(search.condition)
      .orderBy(search.rank)
      .toSQL()
    expect(query).toContain('websearch_to_tsquery')
    expect(query).toContain('%')
    expect(query).toContain('greatest')
  })
})
