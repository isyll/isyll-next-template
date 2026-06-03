-- Dedicated schema for end-user site data (users, sessions, accounts,
-- verifications, audit history). The `public` schema is reserved for global
-- reference data (currencies, countries, timezones) and shared database
-- objects; operators live in the isolated `admin` schema (000011).
CREATE SCHEMA IF NOT EXISTS app;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT USAGE ON SCHEMA app TO app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA app
    GRANT USAGE, SELECT ON SEQUENCES TO app;
  END IF;
END;
$$;

-- Sets updated_at on every row UPDATE, for all writers (ORM, psql, jobs).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Attached to reference tables (currencies, countries, timezones) after they
-- are seeded, so their rows become immutable at the database level.
CREATE OR REPLACE FUNCTION public.prevent_row_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'relation "%" holds immutable reference data', TG_TABLE_NAME
  USING ERRCODE = 'restrict_violation';
END;
$$;

-- Validated, case-insensitive email type reused by every account table.
CREATE DOMAIN public.email_address AS citext
CHECK (value ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
