-- Informational, versioned CUP pricing only. This does not enable billing.
CREATE TABLE public.billing_plan_versions (
  plan_code text NOT NULL CHECK (plan_code IN ('natural_quarterly', 'natural_annual', 'legal_quarterly', 'legal_annual')),
  version integer NOT NULL CHECK (version > 0),
  account_type text NOT NULL CHECK (account_type IN ('natural', 'legal')),
  period_months smallint NOT NULL CHECK (period_months IN (3, 12)),
  price_cup bigint NOT NULL CHECK (price_cup > 0),
  currency text NOT NULL DEFAULT 'CUP' CHECK (currency = 'CUP'),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_code, version),
  CONSTRAINT billing_plan_versions_valid_range CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT billing_plan_versions_code_matches_terms CHECK (
    (plan_code = 'natural_quarterly' AND account_type = 'natural' AND period_months = 3)
    OR (plan_code = 'natural_annual' AND account_type = 'natural' AND period_months = 12)
    OR (plan_code = 'legal_quarterly' AND account_type = 'legal' AND period_months = 3)
    OR (plan_code = 'legal_annual' AND account_type = 'legal' AND period_months = 12)
  )
);

ALTER TABLE public.billing_plan_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_plan_versions FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_billing_plan_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Billing plan versions are immutable.';
END;
$$;
REVOKE ALL ON FUNCTION public.reject_billing_plan_version_mutation() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER billing_plan_versions_immutable
  BEFORE UPDATE OR DELETE ON public.billing_plan_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_billing_plan_version_mutation();

INSERT INTO public.billing_plan_versions
  (plan_code, version, account_type, period_months, price_cup, valid_from)
VALUES
  ('natural_quarterly', 1, 'natural', 3, 200, '2026-11-03 00:00:00+00'),
  ('natural_annual', 1, 'natural', 12, 500, '2026-11-03 00:00:00+00'),
  ('legal_quarterly', 1, 'legal', 3, 10000, '2026-11-03 00:00:00+00'),
  ('legal_annual', 1, 'legal', 12, 30000, '2026-11-03 00:00:00+00');

CREATE OR REPLACE FUNCTION public.get_active_billing_plans()
RETURNS TABLE (
  plan_code text,
  version integer,
  account_type text,
  period_months smallint,
  price_cup bigint,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT DISTINCT ON (plans.plan_code)
    plans.plan_code,
    plans.version,
    plans.account_type,
    plans.period_months,
    plans.price_cup,
    plans.currency
  FROM public.billing_plan_versions AS plans
  WHERE plans.valid_from <= now()
    AND (plans.valid_until IS NULL OR plans.valid_until > now())
  ORDER BY plans.plan_code, plans.valid_from DESC, plans.version DESC;
$$;

REVOKE ALL ON FUNCTION public.get_active_billing_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_billing_plans() TO anon, authenticated;
