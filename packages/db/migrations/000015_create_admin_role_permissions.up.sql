CREATE TABLE admin.role_permissions (
  role_id uuid NOT NULL REFERENCES admin.roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES admin.permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permissions_permission_id_idx ON admin.role_permissions (permission_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON admin.role_permissions TO admin_service;
  END IF;
END;
$$;
