-- Phase 3: a read/provision call must never reactivate an administratively
-- paused referral link. This migration preserves the existing function ACL
-- contract and keeps the RPC unavailable to every API role while the program
-- remains paused. Do not apply before reconciling the Phase 3 migration history.

CREATE OR REPLACE FUNCTION public.ensure_agent_referral_link()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_agent_id uuid := auth.uid();
  v_code text;
  v_active boolean;
BEGIN
  IF v_agent_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_agent_id
      AND role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;

  SELECT code, active INTO v_code, v_active
  FROM public.agent_referral_links
  WHERE agent_id = v_agent_id;

  IF FOUND THEN
    IF NOT v_active THEN
      RAISE EXCEPTION 'Referral link is paused.' USING ERRCODE = '42501';
    END IF;
    RETURN v_code;
  END IF;

  v_code := 'AG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.agent_referral_links (agent_id, code)
  VALUES (v_agent_id, v_code)
  ON CONFLICT (agent_id) DO NOTHING
  RETURNING code INTO v_code;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Another request may have provisioned or an administrator may have paused
  -- the row after the initial read. Re-read and fail closed if it is disabled.
  SELECT code, active INTO v_code, v_active
  FROM public.agent_referral_links
  WHERE agent_id = v_agent_id;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Referral link is paused or unavailable.' USING ERRCODE = '42501';
  END IF;

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_agent_referral_link()
  FROM PUBLIC, anon, authenticated, service_role;
