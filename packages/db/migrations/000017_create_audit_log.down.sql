DROP FUNCTION IF EXISTS app.prune_audit_logs(interval);
DROP TRIGGER IF EXISTS role_permissions_audit ON admin.role_permissions;
DROP TRIGGER IF EXISTS operator_roles_audit ON admin.operator_roles;
DROP TRIGGER IF EXISTS supported_countries_audit ON public.supported_countries;
DROP TRIGGER IF EXISTS roles_audit ON admin.roles;
DROP TRIGGER IF EXISTS operators_audit ON admin.operators;
DROP TRIGGER IF EXISTS users_audit ON app.users;
DROP FUNCTION IF EXISTS app.record_audit();
DROP TABLE IF EXISTS app.audit_logs;
