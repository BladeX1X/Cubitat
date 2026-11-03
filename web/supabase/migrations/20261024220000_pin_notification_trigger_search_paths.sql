-- The contact notification function is invoked by a table trigger, not by a
-- browser RPC. Its application objects are schema-qualified, so only trusted
-- catalog functions need to remain visible through the search path.

ALTER FUNCTION public.handle_new_contact()
  SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.handle_new_contact()
  FROM PUBLIC, anon, authenticated, service_role;
