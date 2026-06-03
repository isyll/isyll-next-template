CREATE SCHEMA IF NOT EXISTS admin;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT USAGE ON SCHEMA admin TO admin_service;
  END IF;
END;
$$;

CREATE TABLE admin.operator (
  id text PRIMARY KEY,
  email public.email_address NOT NULL,
  name text NOT NULL
  CONSTRAINT operator_name_not_blank CHECK (length(btrim(name)) > 0),
  email_verified boolean NOT NULL DEFAULT true,
  image text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_email_unique UNIQUE (email)
);

CREATE TRIGGER operator_set_updated_at BEFORE UPDATE ON admin.operator
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.operator TO admin_service;
  END IF;
END;
$$;
