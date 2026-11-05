-- F4-SVC follow-up: keep the deployed moderation function free of unused state.
-- Production release: retains the stricter moderation status and audit rules.

CREATE OR REPLACE FUNCTION public.moderate_home_service_provider(
  p_provider_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'pause') THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('reject', 'pause') AND char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'moderation_reason_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.home_service_providers provider
    SET status = CASE p_action
          WHEN 'approve' THEN 'published'
          WHEN 'reject' THEN 'rejected'
          ELSE 'paused'
        END,
        updated_at = now()
    WHERE provider.id = p_provider_id
      AND ((provider.status = 'pending_review' AND p_action IN ('approve', 'reject'))
        OR (provider.status = 'published' AND p_action = 'pause'));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_profile_not_moderatable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_service_moderation_audit
    (provider_id, action, reason, actor_id)
  VALUES (p_provider_id, p_action, nullif(btrim(p_reason), ''), (SELECT auth.uid()));
END;
$$;
