-- Maps an end user to their Stripe customer (one customer per user). Stripe is
-- the source of truth for billing; this table is the local join so we can find a
-- user's customer without round-tripping the Stripe API.
CREATE TABLE app.billing_customers (
  user_id text PRIMARY KEY REFERENCES app.users (id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL
  CONSTRAINT billing_customers_stripe_id_not_blank
  CHECK (length(btrim(stripe_customer_id)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_customers_stripe_id_unique
ON app.billing_customers (stripe_customer_id);

CREATE TRIGGER billing_customers_set_updated_at
BEFORE UPDATE ON app.billing_customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.billing_customers TO app;
  END IF;
END;
$$;
