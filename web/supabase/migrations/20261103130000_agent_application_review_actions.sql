-- Audited AAL2 actions for the open portion of the agent application queue.
-- Final approval remains unavailable until province capacity can be assigned transactionally.

CREATE OR REPLACE FUNCTION public.review_agent_application(
  p_application_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_current_status text;
  v_reason text := nullif(btrim(p_reason), '');
  v_now timestamptz := now();
BEGIN
  IF v_actor_id IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;
  IF p_application_id IS NULL OR p_status IS NULL
    OR p_status NOT IN ('reviewing', 'waitlisted', 'rejected')
    OR (v_reason IS NOT NULL AND char_length(v_reason) > 500)
    OR (p_status = 'rejected' AND (v_reason IS NULL OR char_length(v_reason) < 3)) THEN
    RAISE EXCEPTION 'Invalid application review action.' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_current_status
  FROM public.agent_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent application not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_current_status NOT IN ('submitted', 'reviewing', 'waitlisted')
    OR v_current_status = p_status THEN
    RAISE EXCEPTION 'Application status cannot transition from % to %.', v_current_status, p_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.agent_applications
  SET status = p_status,
      final_decision_at = CASE WHEN p_status = 'rejected' THEN v_now ELSE NULL END,
      evidence_delete_after = CASE WHEN p_status = 'rejected' THEN v_now + interval '30 days' ELSE NULL END,
      updated_at = v_now
  WHERE id = p_application_id;

  INSERT INTO public.agent_application_events (application_id, actor_id, from_status, to_status, reason, created_at)
  VALUES (p_application_id, v_actor_id, v_current_status, p_status, v_reason, v_now);

  RETURN p_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_agent_application(uuid, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.review_agent_application(uuid, text, text) TO authenticated;
COMMENT ON FUNCTION public.review_agent_application(uuid, text, text) IS
  'Admin AAL2 audited review transitions. Approval is intentionally withheld until provincial capacity assignment is transactional.';

NOTIFY pgrst, 'reload schema';
