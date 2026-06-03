CREATE TABLE app.users (
  id text PRIMARY KEY,
  name text NOT NULL
  CONSTRAINT users_name_not_blank CHECK (length(btrim(name)) > 0),
  email public.email_address NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX users_name_trgm_idx ON app.users USING gin (name gin_trgm_ops);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON app.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.users TO app;
  END IF;
END;
$$;
