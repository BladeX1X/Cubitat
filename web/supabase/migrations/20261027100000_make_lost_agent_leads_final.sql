-- Only an AAL2 administrator may reopen a lead that was closed as lost.
CREATE OR REPLACE FUNCTION public.update_agent_lead_status(
  p_lead_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_agent_id uuid;
  v_previous text;
  v_is_admin boolean := public.is_admin_aal2();
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_actor_id AND role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;
  SELECT agent_id, status INTO v_agent_id, v_previous
  FROM public.agent_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found.' USING ERRCODE = '22023'; END IF;
  IF NOT v_is_admin AND v_agent_id <> v_actor_id THEN
    RAISE EXCEPTION 'Lead owner required.' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('new', 'contacted', 'qualified', 'converted', 'lost')
    OR (NOT v_is_admin AND p_status IN ('converted', 'lost'))
    OR (v_previous = 'converted' AND p_status <> 'converted')
    OR (v_previous = 'lost' AND p_status NOT IN ('lost', 'contacted'))
    OR (v_previous = 'lost' AND p_status = 'contacted' AND NOT v_is_admin)
    OR (v_previous = 'new' AND p_status NOT IN ('contacted', 'qualified', 'lost'))
    OR (v_previous = 'contacted' AND p_status NOT IN ('qualified', 'lost'))
    OR (v_previous = 'qualified' AND p_status NOT IN ('contacted', 'converted', 'lost')) THEN
    RAISE EXCEPTION 'Lead status transition not allowed.' USING ERRCODE = '22023';
  END IF;
  p_note := nullif(btrim(p_note), '');
  IF v_is_admin AND (p_status IN ('converted', 'lost')
      OR (v_previous = 'lost' AND p_status = 'contacted')) AND p_note IS NULL THEN
    RAISE EXCEPTION 'Review note required for administrative status change.' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 1000 THEN
    RAISE EXCEPTION 'Lead note too long.' USING ERRCODE = '22023';
  END IF;
  IF v_previous = p_status THEN RETURN; END IF;

  UPDATE public.agent_leads
  SET status = p_status, updated_at = now()
  WHERE id = p_lead_id;
  INSERT INTO public.agent_lead_events (lead_id, agent_id, actor_id, from_status, to_status, note)
  VALUES (p_lead_id, v_agent_id, v_actor_id, v_previous, p_status, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.update_agent_lead_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_agent_lead_status(uuid, text, text) TO authenticated;
