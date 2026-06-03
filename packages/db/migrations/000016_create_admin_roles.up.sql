-- Roles are created dynamically by operators with the necessary permission.
-- `is_system` marks built-in roles that the UI should not allow deleting.
CREATE TABLE admin.role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
  CONSTRAINT role_name_not_blank CHECK (length(btrim(name)) > 0),
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER role_set_updated_at BEFORE UPDATE ON admin.role
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.role TO admin_service;
  END IF;
END;
$$;
