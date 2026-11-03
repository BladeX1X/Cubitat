-- Pin the SECURITY DEFINER policy helper to trusted system objects only.
-- Its table, auth helper, enum and cast references are schema-qualified.
ALTER FUNCTION public.is_admin() SET search_path = pg_catalog;
