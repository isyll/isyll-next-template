CREATE TABLE admin.operator_accounts (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES admin.operators (id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_accounts_provider_account_unique UNIQUE (provider_id, account_id)
);

CREATE INDEX operator_accounts_user_id_idx ON admin.operator_accounts (user_id);

CREATE TRIGGER operator_accounts_set_updated_at BEFORE UPDATE ON admin.operator_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.operator_accounts TO admin_service;
  END IF;
END;
$$;
