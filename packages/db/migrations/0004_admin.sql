-- migrate:up

-- Administrators live in their own schema so a bug or accidental query in the
-- user-facing app cannot reach them, and so the DB grant boundary can isolate
-- them from the `app` role entirely.
CREATE SCHEMA IF NOT EXISTS admin;

-- Closed privilege set enforced at the type level.
CREATE TYPE admin.admin_role AS ENUM ('super_admin', 'admin');

CREATE TABLE admin."user" (
  id             text PRIMARY KEY,
  name           text NOT NULL
                   CONSTRAINT admin_user_name_not_blank CHECK (length(btrim(name)) > 0),
  email          public.email_address NOT NULL,
  email_verified boolean NOT NULL DEFAULT true,
  image          text,
  role           admin.admin_role NOT NULL DEFAULT 'admin',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_user_email_unique UNIQUE (email)
);

CREATE TABLE admin.session (
  id         text PRIMARY KEY,
  token      text NOT NULL,
  user_id    text NOT NULL REFERENCES admin."user" (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_session_token_unique UNIQUE (token)
);

CREATE TABLE admin.account (
  id                       text PRIMARY KEY,
  account_id               text NOT NULL,
  provider_id              text NOT NULL,
  user_id                  text NOT NULL REFERENCES admin."user" (id) ON DELETE CASCADE,
  access_token             text,
  refresh_token            text,
  id_token                 text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  scope                    text,
  password                 text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_account_provider_account_unique UNIQUE (provider_id, account_id)
);

CREATE TABLE admin.verification (
  id         text PRIMARY KEY,
  identifier text NOT NULL,
  value      text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_session_user_id_idx ON admin.session (user_id);
CREATE INDEX admin_session_expires_at_idx ON admin.session (expires_at);
CREATE INDEX admin_account_user_id_idx ON admin.account (user_id);
CREATE INDEX admin_verification_identifier_idx ON admin.verification (identifier);

CREATE TRIGGER admin_user_set_updated_at BEFORE UPDATE ON admin."user"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admin_session_set_updated_at BEFORE UPDATE ON admin.session
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admin_account_set_updated_at BEFORE UPDATE ON admin.account
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admin_verification_set_updated_at BEFORE UPDATE ON admin.verification
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grant the admin service role DML on the admin schema only, and explicitly
-- keep the user-facing `app` role out of it. Guarded so the migration still
-- runs on a single-role developer database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    -- USAGE on public lets it reference the shared email_address / citext type.
    GRANT USAGE ON SCHEMA public TO admin_service;
    GRANT USAGE ON SCHEMA admin TO admin_service;
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON admin."user", admin.session, admin.account, admin.verification
      TO admin_service;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    REVOKE ALL ON SCHEMA admin FROM app;
  END IF;
END;
$$;

-- migrate:down

DROP SCHEMA IF EXISTS admin CASCADE;
