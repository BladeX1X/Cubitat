-- Trigger handlers are implementation details and must not be callable as RPCs.
-- PostgreSQL invokes installed triggers without granting API roles EXECUTE.
REVOKE ALL ON FUNCTION public.is_admin()
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
ALTER FUNCTION public.set_search_alerts_updated_at() SET search_path = '';
REVOKE ALL ON FUNCTION public.capture_property_moderation_audit()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_push_endpoint_owner()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enqueue_notification_push_deliveries()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_matching_search_alerts()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_property_status_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_property_address()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_property_coordinates()
  FROM PUBLIC, anon, authenticated, service_role;
