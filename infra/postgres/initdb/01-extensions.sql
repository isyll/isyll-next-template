-- Run once by the Postgres image on first init (as superuser). Extensions are
-- installed in `public` and usable by every role. The migrations re-create the
-- core set with IF NOT EXISTS, so a non-superuser migrator never has to.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
-- Query performance monitoring (paired with shared_preload_libraries).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
