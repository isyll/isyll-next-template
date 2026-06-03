CREATE TABLE public.supported_countries (
  country_code char(2) PRIMARY KEY REFERENCES public.countries (iso2) ON DELETE CASCADE,
  launch_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX supported_countries_is_active_idx ON public.supported_countries (is_active);

CREATE TRIGGER supported_countries_set_updated_at
BEFORE UPDATE ON public.supported_countries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT ON public.supported_countries TO app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.supported_countries TO admin_service;
  END IF;
END;
$$;
