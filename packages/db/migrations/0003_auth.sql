-- migrate:up

-- End-user identity. Mirrored by the Drizzle schema in src/schema/auth.ts;
-- this SQL is the authoritative DDL. No `role` column: privileged access is
-- owned by the separate admin auth system, never by a flag on end users.
CREATE TABLE "user" (
  id             text PRIMARY KEY,
  name           text NOT NULL CONSTRAINT user_name_not_blank CHECK (length(btrim(name)) > 0),
  email          email_address NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_email_unique UNIQUE (email)
);

-- Server-side sessions. The cookie carries only `token`; this row is the source
-- of truth, so deleting it revokes the session immediately.
CREATE TABLE session (
  id         text PRIMARY KEY,
  token      text NOT NULL,
  user_id    text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_token_unique UNIQUE (token)
);

-- Linked credentials: one row per password (provider_id = 'credential') or
-- social provider. (provider_id, account_id) is unique per BetterAuth.
CREATE TABLE account (
  id                       text PRIMARY KEY,
  account_id               text NOT NULL,
  provider_id              text NOT NULL,
  user_id                  text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  access_token             text,
  refresh_token            text,
  id_token                 text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  scope                    text,
  password                 text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_provider_account_unique UNIQUE (provider_id, account_id)
);

-- Short-lived tokens for email verification and password reset.
CREATE TABLE verification (
  id         text PRIMARY KEY,
  identifier text NOT NULL,
  value      text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_user_id_idx ON session (user_id);
CREATE INDEX session_expires_at_idx ON session (expires_at);
CREATE INDEX account_user_id_idx ON account (user_id);
CREATE INDEX verification_identifier_idx ON verification (identifier);
CREATE INDEX verification_expires_at_idx ON verification (expires_at);
-- Trigram index for fuzzy user lookup (ILIKE '%term%') in admin tooling.
CREATE INDEX user_name_trgm_idx ON "user" USING gin (name gin_trgm_ops);

CREATE TRIGGER user_set_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER session_set_updated_at BEFORE UPDATE ON session
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER account_set_updated_at BEFORE UPDATE ON account
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER verification_set_updated_at BEFORE UPDATE ON verification
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Maintenance: drop expired sessions and verification tokens, returning the
-- number removed. Schedule from pg_cron or an external job.
CREATE OR REPLACE FUNCTION purge_expired_auth()
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

-- Least privilege: the migration role owns these objects; the application role
-- (`app`) receives only DML. Guarded with a role check so the same migration
-- runs unchanged on a single-role developer database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT USAGE ON SCHEMA public TO app;
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON "user", session, account, verification TO app;
    GRANT EXECUTE ON FUNCTION purge_expired_auth() TO app;
  END IF;
END;
$$;

-- migrate:down

DROP FUNCTION IF EXISTS purge_expired_auth();
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS "user";
