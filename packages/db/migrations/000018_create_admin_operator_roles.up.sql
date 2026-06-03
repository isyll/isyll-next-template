CREATE TABLE admin.operator_role (
  operator_id text NOT NULL REFERENCES admin.operator (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES admin.role (id) ON DELETE CASCADE,
  PRIMARY KEY (operator_id, role_id)
);

CREATE INDEX operator_role_role_id_idx ON admin.operator_role (role_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.operator_role TO admin_service;
  END IF;
END;
$$;
