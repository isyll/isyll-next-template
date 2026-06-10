-- Append-only change history for audited tables. Rows are written ONLY by the
-- SECURITY DEFINER trigger function below (owned by the migration role), so the
-- service roles can read history but never forge or tamper with it.
CREATE TABLE app.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_schema text NOT NULL,
  table_name text NOT NULL,
  row_id text NOT NULL,
  operation text NOT NULL
  CONSTRAINT audit_logs_operation_check
  CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_columns text [] NOT NULL DEFAULT '{}',
  old_values jsonb,
  new_values jsonb,
  actor_id text,
  actor_type text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx
ON app.audit_logs (table_schema, table_name, row_id);
CREATE INDEX audit_logs_occurred_at_idx ON app.audit_logs (occurred_at);

-- Generic auditing trigger. TG_ARGV[0] is the primary-key column; the remaining
-- arguments are the "watched" columns. On UPDATE only the watched columns that
-- actually changed are recorded (an old→new JSONB diff); an update that touches
-- nothing watched records nothing. Runs as the owner (SECURITY DEFINER) so the
-- invoking role needs no privileges on app.audit_logs, and runs in the caller's
-- transaction: if this INSERT fails, the triggering statement rolls back too.
CREATE OR REPLACE FUNCTION app.record_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  pk_column text := TG_ARGV[0];
  watched text[] := TG_ARGV[1:];
  old_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  new_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  changed text[];
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(col ORDER BY col) INTO changed
    FROM unnest(watched) AS col
    WHERE (old_row -> col) IS DISTINCT FROM (new_row -> col);
    IF changed IS NULL THEN
      RETURN null;
    END IF;
  ELSE
    changed := watched;
  END IF;

  SELECT jsonb_object_agg(col, old_row -> col) INTO v_old
  FROM unnest(changed) AS col
  WHERE old_row IS NOT NULL;

  SELECT jsonb_object_agg(col, new_row -> col) INTO v_new
  FROM unnest(changed) AS col
  WHERE new_row IS NOT NULL;

  INSERT INTO app.audit_logs (
    table_schema, table_name, row_id, operation,
    changed_columns, old_values, new_values, actor_id, actor_type
  )
  VALUES (
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    coalesce(new_row, old_row) ->> pk_column,
    TG_OP,
    changed,
    v_old,
    v_new,
    nullif(current_setting('app.actor_id', true), ''),
    nullif(current_setting('app.actor_type', true), '')
  );

  RETURN null;
END;
$$;

CREATE TRIGGER users_audit
AFTER INSERT OR UPDATE OR DELETE ON app.users
FOR EACH ROW
EXECUTE FUNCTION app.record_audit('id', 'email', 'email_verified', 'name', 'deleted_at');

CREATE TRIGGER operators_audit
AFTER INSERT OR UPDATE OR DELETE ON admin.operators
FOR EACH ROW
EXECUTE FUNCTION app.record_audit(
  'id', 'is_active', 'email', 'name', 'email_verified', 'deleted_at'
);

CREATE TRIGGER roles_audit
AFTER INSERT OR UPDATE OR DELETE ON admin.roles
FOR EACH ROW
EXECUTE FUNCTION app.record_audit(
  'id', 'name', 'description', 'is_system', 'deleted_at'
);

CREATE TRIGGER supported_countries_audit
AFTER INSERT OR UPDATE OR DELETE ON public.supported_countries
FOR EACH ROW
EXECUTE FUNCTION app.record_audit(
  'country_code', 'is_active', 'launch_date', 'deleted_at'
);

-- Privilege-grant join tables (composite PK, insert/delete only): the anchor
-- column is the row_id, both columns are watched so the pair is recorded.
CREATE TRIGGER operator_roles_audit
AFTER INSERT OR UPDATE OR DELETE ON admin.operator_roles
FOR EACH ROW
EXECUTE FUNCTION app.record_audit('operator_id', 'operator_id', 'role_id');

CREATE TRIGGER role_permissions_audit
AFTER INSERT OR UPDATE OR DELETE ON admin.role_permissions
FOR EACH ROW
EXECUTE FUNCTION app.record_audit('role_id', 'role_id', 'permission_id');

-- History is readable, never writable, by the service roles. The default
-- privileges granted on the `app` schema (migration 000002) would otherwise let
-- the app role write here, so revoke first. admin_service reads operator/role
-- history, so it gets USAGE on `app` plus SELECT on this one table only.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    REVOKE ALL ON app.audit_logs FROM app;
    GRANT SELECT ON app.audit_logs TO app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT USAGE ON SCHEMA app TO admin_service;
    GRANT SELECT ON app.audit_logs TO admin_service;
  END IF;
END;
$$;

-- Scheduled retention (worker:jobs). The app role only has SELECT here, so the
-- prune runs as the table owner (SECURITY DEFINER) and returns the rows removed.
CREATE OR REPLACE FUNCTION app.prune_audit_logs(retain interval)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  removed bigint;
BEGIN
  DELETE FROM app.audit_logs WHERE occurred_at < now() - retain;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION app.prune_audit_logs(interval) FROM public;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT EXECUTE ON FUNCTION app.prune_audit_logs(interval) TO app;
  END IF;
END;
$$;
