CREATE TABLE admin.operator_roles (
  operator_id text NOT NULL REFERENCES admin.operators (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin.roles (id) ON DELETE CASCADE,
  PRIMARY KEY (operator_id, role_id)
);

CREATE INDEX operator_roles_role_id_idx ON admin.operator_roles (role_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.operator_roles TO admin_service;
  END IF;
END;
$$;
