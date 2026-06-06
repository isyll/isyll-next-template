CREATE TABLE app.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  type text NOT NULL
  CONSTRAINT notifications_type_not_blank CHECK (length(btrim(type)) > 0),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Newest-first listing of a user's live notifications.
CREATE INDEX notifications_user_idx
ON app.notifications (user_id, created_at DESC) WHERE deleted_at IS null;

-- Fast unread-badge count.
CREATE INDEX notifications_user_unread_idx
ON app.notifications (user_id) WHERE read_at IS null AND deleted_at IS null;

CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON app.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.notifications TO app;
  END IF;
END;
$$;
