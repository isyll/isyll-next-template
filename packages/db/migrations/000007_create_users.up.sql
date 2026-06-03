CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL
  CONSTRAINT user_name_not_blank CHECK (length(btrim(name)) > 0),
  email email_address NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_email_unique UNIQUE (email)
);

CREATE INDEX user_name_trgm_idx ON "user" USING gin (name gin_trgm_ops);

CREATE TRIGGER user_set_updated_at BEFORE UPDATE ON "user"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "user" TO app;
  END IF;
END;
$$;
