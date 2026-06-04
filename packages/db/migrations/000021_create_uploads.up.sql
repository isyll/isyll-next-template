CREATE TABLE app.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  bucket text NOT NULL,
  object_key text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL
  CONSTRAINT uploads_size_positive CHECK (size_bytes > 0),
  original_name text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One live row per stored object.
CREATE UNIQUE INDEX uploads_object_key_unique
ON app.uploads (bucket, object_key) WHERE deleted_at IS null;

-- Newest-first listing of a user's live uploads.
CREATE INDEX uploads_user_idx
ON app.uploads (user_id, created_at DESC) WHERE deleted_at IS null;

CREATE TRIGGER uploads_set_updated_at BEFORE UPDATE ON app.uploads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.uploads TO app;
  END IF;
END;
$$;
