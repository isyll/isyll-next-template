# Search

Postgres-native search, with no extra infrastructure: **full-text** via a
generated `tsvector` column + GIN index queried with `websearch_to_tsquery`,
combined with **`pg_trgm`** trigram matching for typo-tolerant, prefix-friendly
autocomplete. The query-building primitives are a thin, typed seam
(`@workspace/db` → `lib/search.ts`) that any table can use — and that can be
swapped for an external engine (Meilisearch, Typesense, OpenSearch) later
without changing the DAL shape.

## How it works

Full-text and trigram solve different problems, so the search combines both:

- **`websearch_to_tsquery`** parses raw user input safely (quoted `"phrases"`,
  `OR`, `-negation`) and matches whole lexemes — great for multi-word and email
  queries. It never throws on malformed input.
- **`pg_trgm`** (`%` operator / `similarity()`) matches by 3-gram overlap —
  great for partial words and typos (`jon` → `John`), backed by a
  `gin_trgm_ops` index.

`smartTextSearch(...)` ORs the two arms and ranks by the **greater** of the
full-text rank and the trigram similarity.

## The building blocks (`@workspace/db`)

```ts
import {
  ftsMatch,
  ftsRank,
  trigramMatch,
  trigramSimilarity,
  smartTextSearch,
} from '@workspace/db'

ftsMatch(vector, term) // vector @@ websearch_to_tsquery('simple', term)
ftsRank(vector, term) // ts_rank(...) for ORDER BY
trigramMatch(column, term) // column % term   (uses the gin_trgm_ops index)
trigramSimilarity(column, term) // similarity(column, term) in [0,1]

const { condition, rank } = smartTextSearch({
  vector: sql`search_vector`, // a tsvector column / expression
  trigramColumn: users.name, // a gin_trgm_ops-indexed text column
  term,
})
```

All terms are bound parameters (injection-safe). The default text-search config
is `simple` (language-agnostic — right for names, emails and identifiers); pass
`'french'`/`'english'` for natural-language stemming.

## Worked example — user search

`app.users` carries a generated, stored FTS column (see
`migrations/000007_create_users.up.sql`):

```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', name || ' ' || email::text)
) STORED
-- CREATE INDEX users_search_idx ON app.users USING gin (search_vector);
-- CREATE INDEX users_name_trgm_idx ON app.users USING gin (name gin_trgm_ops);
```

The operator-console user list uses `smartTextSearch` for filtering + ranking,
and `suggestUsers(term)` provides trigram autocomplete — both in
[`apps/web/features/admin-users/queries.ts`](../apps/web/features/admin-users/queries.ts).

## Adding search to another table

1. Add a generated `search_vector tsvector … STORED` column over the searchable
   text **in that table's existing migration**, plus
   `CREATE INDEX … USING gin (search_vector)`. For autocomplete add a
   `gin (col gin_trgm_ops)` index on the column you want fuzzy-matched.
2. In the DAL, build the condition with `smartTextSearch({ vector: sql`search_vector`, trigramColumn, term })`
   and order by its `rank`.

## Upgrading to an external engine

Keep the DAL function signatures (`listX({ search })`, `suggestX(term)`) and
replace their bodies with calls to the external client. The rest of the app —
pages, actions, types — is unaffected, because search is already behind the DAL.
