-- Sets updated_at on every row UPDATE, for all writers (ORM, psql, jobs).
CREATE OR REPLACE FUNCTION set_updated_at()
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
CREATE OR REPLACE FUNCTION prevent_row_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'relation "%" holds immutable reference data', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;

-- Validated, case-insensitive email type reused by every account table.
CREATE DOMAIN email_address AS citext
  CHECK (VALUE ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
