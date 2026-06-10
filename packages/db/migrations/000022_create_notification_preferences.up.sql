-- Per-channel notification preferences. One row per (user, channel); a missing
-- row means the default (enabled). Senders consult these before delivering
-- through a channel (in-app inbox, transactional email).
CREATE TABLE app.notification_preferences (
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  channel text NOT NULL
  CONSTRAINT notification_preferences_channel_check
  CHECK (channel IN ('in_app', 'email')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel)
);

CREATE TRIGGER notification_preferences_set_updated_at
BEFORE UPDATE ON app.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.notification_preferences TO app;
  END IF;
END;
$$;
