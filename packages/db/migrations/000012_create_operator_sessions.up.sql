CREATE TABLE admin.operator_sessions (
  id text PRIMARY KEY,
  token text NOT NULL,
  user_id text NOT NULL REFERENCES admin.operators (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_sessions_token_unique UNIQUE (token)
);

CREATE INDEX operator_sessions_user_id_idx ON admin.operator_sessions (user_id);
CREATE INDEX operator_sessions_expires_at_idx ON admin.operator_sessions (expires_at);

CREATE TRIGGER operator_sessions_set_updated_at BEFORE UPDATE ON admin.operator_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.operator_sessions TO admin_service;
  END IF;
END;
$$;
