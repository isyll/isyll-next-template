CREATE TABLE app.verifications (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verifications_identifier_idx ON app.verifications (identifier);
CREATE INDEX verifications_expires_at_idx ON app.verifications (expires_at);

CREATE TRIGGER verifications_set_updated_at BEFORE UPDATE ON app.verifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Maintenance helper: delete expired user sessions and verification tokens,
-- returning the number of rows removed. Schedule from pg_cron or a job runner.
CREATE OR REPLACE FUNCTION app.purge_expired_user_auth()
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  removed bigint;
BEGIN
  WITH s AS (DELETE FROM app.sessions WHERE expires_at < now() RETURNING 1),
  v AS (DELETE FROM app.verifications WHERE expires_at < now() RETURNING 1)
  SELECT (SELECT count(*) FROM s) + (SELECT count(*) FROM v) INTO removed;
  RETURN removed;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.verifications TO app;
    GRANT EXECUTE ON FUNCTION app.purge_expired_user_auth() TO app;
  END IF;
END;
$$;
