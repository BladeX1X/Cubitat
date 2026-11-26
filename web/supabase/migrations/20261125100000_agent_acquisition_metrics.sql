-- Return aggregate signup attribution to the authenticated, verified agent.
-- Subscription payments are not enabled yet, so the paid-user count stays NULL.
CREATE OR REPLACE FUNCTION public.get_own_agent_acquisition_metrics()
RETURNS TABLE (
  registered_users bigint,
  paid_users bigint,
  payment_tracking_available boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_agent_id uuid := auth.uid();
BEGIN
  IF v_agent_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = v_agent_id
      AND profile.role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND profile.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT count(*)::bigint, NULL::bigint, false
  FROM public.agent_signup_attributions AS attribution
  WHERE attribution.agent_id = v_agent_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_agent_acquisition_metrics()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_agent_acquisition_metrics() TO authenticated;
