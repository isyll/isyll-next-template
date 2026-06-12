CREATE TABLE app.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  type text NOT NULL
  CONSTRAINT notifications_type_not_blank CHECK (length(btrim(type)) > 0),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Optional stable key making delivery idempotent: at-least-once event handlers
  -- can replay, so they pass a dedupe_key (e.g. 'welcome') and a re-delivery is
  -- a no-op instead of a duplicate notification.
  dedupe_key text,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most one notification per (user, dedupe_key). Not filtered on deleted_at:
-- once delivered, a replay must not re-create it even if the user deleted it.
CREATE UNIQUE INDEX notifications_dedupe_key_unique
ON app.notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT null;

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
