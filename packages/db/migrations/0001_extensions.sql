-- migrate:up

-- gen_random_uuid(), digest(), crypt(): UUID defaults and hashing helpers.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Case-insensitive text. Backs the `email_address` domain so addresses compare
-- and unique-index without per-query lower() calls.
CREATE EXTENSION IF NOT EXISTS citext;

-- Trigram similarity for fast ILIKE / fuzzy search on names and emails.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Allows a single GIN index to combine trigram ops with plain scalar columns
-- (compound search indexes that also filter on equality).
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- migrate:down

DROP EXTENSION IF EXISTS btree_gin;
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS pgcrypto;
