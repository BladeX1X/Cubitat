-- Owner-authorized temporary exception for all production admins.
-- The server-side deadline is written once when this migration is applied and
-- cannot be extended by rerunning the migration or by authenticated clients.

CREATE TABLE public.admin_mfa_temporary_overrides (
  override_key text PRIMARY KEY CHECK (override_key = 'global'),
  expires_at timestamptz NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

ALTER TABLE public.admin_mfa_temporary_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_mfa_temporary_overrides FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.admin_mfa_temporary_overrides (override_key, expires_at)
VALUES ('global', statement_timestamp() + interval '7 days')
ON CONFLICT (override_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_admin_mfa_bypass_until()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND public.is_admin() THEN (
      SELECT override.expires_at
      FROM public.admin_mfa_temporary_overrides AS override
      WHERE override.override_key = 'global'
    )
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_mfa_bypass_until() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_mfa_bypass_until() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT public.is_admin()
    AND (
      public.is_aal2()
      OR public.get_admin_mfa_bypass_until() > statement_timestamp()
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_aal2() TO authenticated;
