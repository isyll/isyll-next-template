-- Local mirror of Stripe subscriptions, kept in sync by webhook events routed
-- through the outbox. The primary key is the Stripe subscription id; `status`
-- is stored as free text because Stripe's set of statuses evolves.
CREATE TABLE app.subscriptions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  status text NOT NULL
  CONSTRAINT subscriptions_status_not_blank CHECK (length(btrim(status)) > 0),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A user's subscriptions (newest first via created_at at query time).
CREATE INDEX subscriptions_user_idx ON app.subscriptions (user_id);

CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON app.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.subscriptions TO app;
  END IF;
END;
$$;
