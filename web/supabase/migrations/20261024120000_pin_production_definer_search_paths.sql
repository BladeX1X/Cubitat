-- Pin the remaining production SECURITY DEFINER search paths to trusted
-- catalog functions. Referenced application objects are schema-qualified.

ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog;
ALTER FUNCTION public.is_admin()
  SET search_path = pg_catalog;
-- Retired legacy RPC: keep its path safe even though execution is revoked.
ALTER FUNCTION public.set_property_ai_moderation(
  uuid,
  public.property_status,
  text
)
  SET search_path = pg_catalog;
