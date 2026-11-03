-- Cap raw RPC inputs before trimming or evaluating regular expressions.
-- PostgREST callers can bypass client-side input maxLength attributes.
CREATE OR REPLACE FUNCTION public.create_agent_lead(
  p_lead_type text,
  p_contact_name text,
  p_contact_phone text,
  p_property_title text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_client_interest text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_consent_confirmed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_agent_id uuid := auth.uid();
  v_lead_id uuid;
  v_recent_lead_count integer;
BEGIN
  IF v_agent_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_agent_id
      AND role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;

  -- Enforce UTF-8 byte ceilings derived from the character limits below.
  -- In particular, reject oversized phone strings before btrim/regex work.
  IF (p_lead_type IS NOT NULL AND octet_length(p_lead_type) > 32)
    OR (p_contact_name IS NOT NULL AND octet_length(p_contact_name) > 480)
    OR (p_contact_phone IS NOT NULL AND octet_length(p_contact_phone) > 64)
    OR (p_property_title IS NOT NULL AND octet_length(p_property_title) > 640)
    OR (p_location IS NOT NULL AND octet_length(p_location) > 720)
    OR (p_client_interest IS NOT NULL AND octet_length(p_client_interest) > 2000)
    OR (p_notes IS NOT NULL AND octet_length(p_notes) > 4000) THEN
    RAISE EXCEPTION 'Invalid agent lead.' USING ERRCODE = '22023';
  END IF;

  p_contact_name := btrim(p_contact_name);
  p_contact_phone := btrim(p_contact_phone);
  p_property_title := nullif(btrim(p_property_title), '');
  p_location := nullif(btrim(p_location), '');
  p_client_interest := nullif(btrim(p_client_interest), '');
  p_notes := nullif(btrim(p_notes), '');

  IF p_consent_confirmed IS DISTINCT FROM true
    OR p_contact_name IS NULL OR char_length(p_contact_name) NOT BETWEEN 2 AND 120
    OR p_contact_phone IS NULL OR p_contact_phone !~ '^[+0-9(). -]+$'
    OR char_length(regexp_replace(p_contact_phone, '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15
    OR (p_notes IS NOT NULL AND char_length(p_notes) > 1000)
    OR p_lead_type NOT IN ('property', 'client')
    OR (p_lead_type = 'property' AND (
      p_property_title IS NULL OR char_length(p_property_title) NOT BETWEEN 3 AND 160
      OR p_location IS NULL OR char_length(p_location) NOT BETWEEN 2 AND 180
    ))
    OR (p_lead_type = 'client' AND (
      p_client_interest IS NULL OR char_length(p_client_interest) NOT BETWEEN 3 AND 500
    )) THEN
    RAISE EXCEPTION 'Invalid agent lead.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('lock_timeout', '2s', true);
  PERFORM pg_advisory_xact_lock(hashtextextended('agent-lead-quota:' || v_agent_id::text, 0));

  SELECT count(*) INTO v_recent_lead_count
  FROM public.agent_leads
  WHERE agent_id = v_agent_id
    AND created_at >= clock_timestamp() - interval '24 hours';

  IF v_recent_lead_count >= 20 THEN
    RAISE EXCEPTION 'Agent lead creation limit reached.' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.agent_leads (
    agent_id, lead_type, contact_name, contact_phone,
    property_title, location, client_interest, notes, consent_confirmed
  ) VALUES (
    v_agent_id, p_lead_type, p_contact_name, p_contact_phone,
    p_property_title, p_location, p_client_interest, p_notes, true
  ) RETURNING id INTO v_lead_id;

  INSERT INTO public.agent_lead_events (lead_id, agent_id, actor_id, to_status, note)
  VALUES (v_lead_id, v_agent_id, v_agent_id, 'new', 'Oportunidad registrada');
  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_agent_lead(text, text, text, text, text, text, text, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agent_lead(text, text, text, text, text, text, text, boolean)
  TO authenticated;
