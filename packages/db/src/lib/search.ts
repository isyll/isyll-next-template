import { sql, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

/**
 * Typed Postgres search building blocks — a thin, composable layer over
 * `websearch_to_tsquery` (full-text) and `pg_trgm` (typo-tolerant similarity).
 *
 * It is the seam the roadmap calls for: callers build conditions/rankings from
 * these helpers against any `tsvector` column or `gin_trgm_ops`-indexed text
 * column, and the whole thing can be swapped for an external engine later
 * without changing the DAL shape. All user input is passed as bound parameters,
 * so it is injection-safe, and `websearch_to_tsquery` never throws on bad syntax
 * (it tolerates quotes, `OR`, and `-negation` from raw query strings).
 */

/** A Postgres text-search configuration. `simple` = language-agnostic. */
export type TextSearchConfig = 'simple' | 'english' | 'french'

/** `vector @@ websearch_to_tsquery(config, term)` — the full-text MATCH predicate. */
export function ftsMatch(
  vector: SQL | PgColumn,
  term: string,
  config: TextSearchConfig = 'simple'
): SQL {
  return sql`${vector} @@ websearch_to_tsquery(${config}::regconfig, ${term})`
}

/** `ts_rank(...)` relevance score for ordering (higher = more relevant). */
export function ftsRank(
  vector: SQL | PgColumn,
  term: string,
  config: TextSearchConfig = 'simple'
): SQL<number> {
  return sql<number>`ts_rank(${vector}, websearch_to_tsquery(${config}::regconfig, ${term}))`
}

/** Trigram similarity in `[0, 1]` (needs `pg_trgm`); good for ranking suggestions. */
export function trigramSimilarity(column: PgColumn, term: string): SQL<number> {
  return sql<number>`similarity(${column}, ${term})`
}

/** `column % term` — trigram MATCH, backed by a `gin_trgm_ops` index. */
export function trigramMatch(column: PgColumn, term: string): SQL {
  return sql`${column} % ${term}`
}

export interface SmartSearch {
  /** WHERE predicate: full-text match OR fuzzy trigram match. */
  readonly condition: SQL
  /** ORDER BY expression: the better of the FTS rank and trigram similarity. */
  readonly rank: SQL<number>
}

/**
 * Combine full-text and trigram search into one condition + ranking. Full-text
 * handles multi-word, phrase and email queries; the trigram arm adds prefix /
 * typo tolerance. Order results by `rank` descending.
 */
export function smartTextSearch(options: {
  /** A `tsvector` column or SQL expression (e.g. a generated `search_vector`). */
  vector: SQL | PgColumn
  /** A `gin_trgm_ops`-indexed text column for the fuzzy arm. */
  trigramColumn: PgColumn
  term: string
  config?: TextSearchConfig
}): SmartSearch {
  const { vector, trigramColumn, term, config = 'simple' } = options
  return {
    condition: sql`(${ftsMatch(vector, term, config)} or ${trigramMatch(trigramColumn, term)})`,
    rank: sql<number>`greatest(${ftsRank(vector, term, config)}, ${trigramSimilarity(trigramColumn, term)})`,
  }
}
