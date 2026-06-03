CREATE TABLE admin.operator_verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX operator_verification_identifier_idx ON admin.operator_verification (identifier);

CREATE TRIGGER operator_verification_set_updated_at BEFORE UPDATE ON admin.operator_verification
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.operator_verification TO admin_service;
  END IF;
END;
$$;
