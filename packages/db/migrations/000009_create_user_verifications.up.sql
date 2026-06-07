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

-- Maintenance helper: purge expired verification tokens. Sessions are stored
-- in Redis (not PostgreSQL) so only the verifications table is cleaned here.
-- Schedule from pg_cron or via the jobs worker.
CREATE OR REPLACE FUNCTION app.purge_expired_user_auth()
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  removed bigint;
BEGIN
  DELETE FROM app.verifications WHERE expires_at < now();
  GET DIAGNOSTICS removed = ROW_COUNT;
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
