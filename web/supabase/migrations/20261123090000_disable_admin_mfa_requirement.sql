-- Disable the AAL2 requirement for administrator actions until MFA is
-- deliberately re-enabled in a future migration. The admin role check stays
-- in place for every caller of this compatibility helper.
CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_admin_aal2() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_aal2() TO authenticated;

NOTIFY pgrst, 'reload schema';
