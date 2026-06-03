CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verification_identifier_idx ON verification (identifier);
CREATE INDEX verification_expires_at_idx ON verification (expires_at);

CREATE TRIGGER verification_set_updated_at BEFORE UPDATE ON verification
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Maintenance helper: delete expired user sessions and verification tokens,
-- returning the number of rows removed. Schedule from pg_cron or a job runner.
CREATE OR REPLACE FUNCTION purge_expired_user_auth()
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  removed bigint;
BEGIN
  WITH s AS (DELETE FROM session WHERE expires_at < now() RETURNING 1),
       v AS (DELETE FROM verification WHERE expires_at < now() RETURNING 1)
  SELECT (SELECT count(*) FROM s) + (SELECT count(*) FROM v) INTO removed;
  RETURN removed;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON verification TO app;
    GRANT EXECUTE ON FUNCTION purge_expired_user_auth() TO app;
  END IF;
END;
$$;
