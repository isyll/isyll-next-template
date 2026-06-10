-- DB-backed feature flags (Drizzle mirror of this pure-SQL migration). Each row
-- is the runtime configuration for one flag key: a kill switch (`enabled`), a
-- map of named `variants` → JSON values, the `default_variant` served when on
-- with no matching rule, the `off_variant` served when the kill switch is off,
-- and ordered targeting `rules` (first match wins). The evaluation logic lives
-- in `@workspace/core` (`evaluateFlag`); the app reads rows through a Redis-cached
-- provider. Flags are configuration, not user data, so no soft-delete: the
-- catalogue sync reconciles rows, and changes emit a `feature_flag.changed`
-- domain event for rollout metrics.
CREATE TABLE app.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL
  CONSTRAINT feature_flags_key_not_blank CHECK (length(btrim(key)) > 0),
  description text,
  type text NOT NULL DEFAULT 'boolean'
  CONSTRAINT feature_flags_type_check
  CHECK (type IN ('boolean', 'string', 'number', 'json')),
  -- Kill switch: when false the flag always serves `off_variant`.
  enabled boolean NOT NULL DEFAULT false,
  -- Named variants → JSON values, e.g. {"enabled": true, "disabled": false}.
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_variant text NOT NULL,
  off_variant text NOT NULL,
  -- Ordered targeting rules (TargetingRule[]); the first matching rule wins.
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Referential integrity: the served variants must be declared in `variants`.
  CONSTRAINT feature_flags_default_variant_present CHECK (variants ? default_variant),
  CONSTRAINT feature_flags_off_variant_present CHECK (variants ? off_variant)
);

-- One configuration row per flag key (the lookup key at evaluation time).
CREATE UNIQUE INDEX feature_flags_key_unique ON app.feature_flags (key);

CREATE TRIGGER feature_flags_set_updated_at BEFORE UPDATE ON app.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.feature_flags TO app;
  END IF;
END;
$$;
