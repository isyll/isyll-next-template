-- migrate:up

-- Trigger function shared by every table with an `updated_at` column. A DB-side
-- trigger keeps the timestamp correct for ALL writers (ORM, psql, other
-- services), which application-level `$onUpdate` cannot guarantee.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Validated, case-insensitive email type reused by any table that stores an
-- address. Centralizing the CHECK here means the format rule cannot drift
-- between tables.
CREATE DOMAIN email_address AS citext
  CHECK (VALUE ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- migrate:down

DROP DOMAIN IF EXISTS email_address;
DROP FUNCTION IF EXISTS set_updated_at();
