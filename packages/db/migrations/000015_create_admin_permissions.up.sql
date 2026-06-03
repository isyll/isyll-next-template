-- Permission keys are defined in application code and synced into this table;
-- the format check keeps them as dotted lowercase identifiers (e.g. operators.read).
CREATE TABLE admin.permission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE
  CONSTRAINT permission_key_format
  CHECK (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.permission TO admin_service;
  END IF;
END;
$$;
