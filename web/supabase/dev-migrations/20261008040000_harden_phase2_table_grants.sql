-- DEV ONLY: remove inherited table-level privileges that RLS cannot constrain.
REVOKE ALL ON TABLE public.kyc_requests,
  public.property_verification_requests,
  public.push_subscriptions,
  public.saved_properties,
  public.search_alerts
FROM PUBLIC, anon, authenticated;

-- Requests are created/reviewed through authenticated, ownership-checked RPCs.
GRANT SELECT ON TABLE public.kyc_requests TO authenticated;
GRANT SELECT ON TABLE public.property_verification_requests TO authenticated;

-- Push subscription CRUD is performed by the Worker with service_role.
-- Keep the client from bypassing that authenticated Worker boundary.

GRANT SELECT, INSERT, DELETE ON TABLE public.saved_properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_alerts TO authenticated;
