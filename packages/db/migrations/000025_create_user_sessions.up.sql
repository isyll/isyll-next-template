-- End-user sessions.
--
-- In production, sessions live exclusively in Redis (BetterAuth
-- `secondaryStorage`, fast TTL-based lookup) and this table is never written
-- to. When `REDIS_URL` is unset (e.g. local dev without Redis), BetterAuth
-- falls back to its primary Drizzle adapter and persists sessions here instead.
-- The table therefore MUST exist for the no-Redis fallback to work.
--
-- `token` is an opaque application session token (NOT an OAuth provider token —
-- those live on app.accounts). Timestamps are UTC.
CREATE TABLE app.sessions (
  id text PRIMARY KEY,
  token text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON app.sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON app.sessions (expires_at);

CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON app.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.sessions TO app;
  END IF;
END;
$$;
