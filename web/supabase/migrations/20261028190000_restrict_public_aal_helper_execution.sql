-- AAL helpers are used by authenticated RLS/admin paths, not public API calls.
-- Explicitly revoke role-specific defaults in addition to PUBLIC.
REVOKE ALL ON FUNCTION public.is_aal2() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_aal2() TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin_aal2() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_aal2() TO authenticated;

-- Coordinate/address transformers are internal to the property triggers and
-- migrations; direct PostgREST calls have no client use case.
REVOKE ALL ON FUNCTION public.public_property_location(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.normalize_property_coordinates_json(jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.approximate_property_coordinates(jsonb) FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
