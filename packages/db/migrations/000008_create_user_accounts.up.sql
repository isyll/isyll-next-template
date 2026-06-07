-- OAuth provider accounts linked to end-user identities.
-- An account row is created for every provider a user signs in with (including
-- the built-in 'credential' provider for email+password).
--
-- access_token / refresh_token / id_token are PROVIDER tokens (e.g. a Google
-- OAuth2 access token). They are NOT application JWTs. Application sessions use
-- Redis (cookie-backed opaque tokens); these columns are only populated for
-- social-login accounts and are null for email+password accounts.
CREATE TABLE app.accounts (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  -- OAuth provider tokens (null for email+password accounts).
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  -- Hashed password for the 'credential' provider; null for social accounts.
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_provider_account_unique UNIQUE (provider_id, account_id)
);

CREATE INDEX accounts_user_id_idx ON app.accounts (user_id);

CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON app.accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.accounts TO app;
  END IF;
END;
$$;
