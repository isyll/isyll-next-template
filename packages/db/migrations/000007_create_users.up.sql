CREATE TABLE app.users (
  id text PRIMARY KEY,
  name text NOT NULL
  CONSTRAINT users_name_not_blank CHECK (length(btrim(name)) > 0),
  email public.email_address NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  -- Preferred language (BCP-47 short code) for the UI and transactional emails.
  language text NOT NULL DEFAULT 'fr'
  CONSTRAINT users_language_not_blank CHECK (length(btrim(language)) > 0),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Full-text search vector over name + email. The 'simple' config is
  -- language-agnostic (no stemming/stopwords) — right for names and email
  -- addresses; email is citext, cast to text so the expression stays immutable
  -- (required for a generated column).
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', name || ' ' || email::text)
  ) STORED
);

-- Email is unique among live (not soft-deleted) users, so the address frees up
-- once an account is soft-deleted.
CREATE UNIQUE INDEX users_email_unique ON app.users (email) WHERE deleted_at IS null;

-- Typo-tolerant autocomplete on name (pg_trgm).
CREATE INDEX users_name_trgm_idx ON app.users USING gin (name gin_trgm_ops);

-- Full-text search (websearch_to_tsquery) over name + email.
CREATE INDEX users_search_idx ON app.users USING gin (search_vector);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON app.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.users TO app;
  END IF;
END;
$$;
