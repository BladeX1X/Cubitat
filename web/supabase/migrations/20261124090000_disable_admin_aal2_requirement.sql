-- Keep administrative authorization tied to the admin role, without requiring TOTP/AAL2.
-- Existing policies and RPCs continue to call this helper and retain their role checks.

CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_admin_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_aal2() TO authenticated;
