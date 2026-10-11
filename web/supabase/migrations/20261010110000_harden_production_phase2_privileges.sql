-- Production counterpart of the DEV-only privilege hardening verified on 2026-10-08.
-- Remove historical grants that survived REVOKE FROM PUBLIC, then regrant only
-- operations used by the application. RLS policies remain the row-level boundary.

REVOKE ALL ON TABLE public.contacts,
  public.notifications,
  public.profiles,
  public.properties,
  public.property_reports
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.contacts TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.properties TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.property_reports TO authenticated;

REVOKE ALL ON TABLE public.kyc_requests,
  public.property_verification_requests,
  public.property_duplicate_flags,
  public.push_subscriptions,
  public.saved_properties,
  public.search_alerts
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.kyc_requests,
  public.property_verification_requests,
  public.property_duplicate_flags
TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.saved_properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_alerts TO authenticated;

-- Push delivery returns endpoint credentials and must be called only by Worker.
REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.authorize_push_delivery(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_push_delivery(uuid, integer)
  TO service_role;

-- The RPC enforces AAL2 internally; anonymous invocation is unnecessary.
REVOKE ALL ON FUNCTION public.get_admin_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated;

-- Preserve public counting for visible listings only; drafts/hidden IDs are no-op.
CREATE OR REPLACE FUNCTION public.increment_property_view_count(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = property_id
    AND status = 'published'::public.property_status;
END;
$$;

COMMENT ON FUNCTION public.increment_property_view_count(uuid) IS
  'Increments the public view count only for published properties.';