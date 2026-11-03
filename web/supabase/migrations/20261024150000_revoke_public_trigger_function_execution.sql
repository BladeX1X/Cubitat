-- Trigger functions are invoked through already-installed triggers, not as
-- browser RPCs. Keep EXECUTE private after trigger creation.

REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_profile_role_update()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.apply_property_duplicate_signal()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.persist_property_duplicate_flag()
  FROM PUBLIC, anon, authenticated, service_role;
