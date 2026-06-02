CREATE TABLE admin.role_permission (
  role_id       uuid NOT NULL REFERENCES admin.role (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES admin.permission (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permission_permission_id_idx ON admin.role_permission (permission_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.role_permission TO admin_service;
  END IF;
END;
$$;
