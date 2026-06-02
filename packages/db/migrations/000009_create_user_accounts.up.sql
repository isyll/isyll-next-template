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

CREATE INDEX account_user_id_idx ON account (user_id);

CREATE TRIGGER account_set_updated_at BEFORE UPDATE ON account
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON account TO app;
  END IF;
END;
$$;
