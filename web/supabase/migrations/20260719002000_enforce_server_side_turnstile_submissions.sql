-- Require public contact and report submissions to pass through the Cubitat
-- Worker, where Turnstile is validated before these service-role-only RPCs run.

DROP POLICY IF EXISTS "Allow public insert for contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow validated contacts for published properties" ON public.contacts;
REVOKE INSERT ON TABLE public.contacts FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert a report" ON public.property_reports;
REVOKE INSERT ON TABLE public.property_reports FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_contact_trusted(
  p_property_id uuid,
  p_contact_name text,
  p_contact_phone text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  p_contact_name := btrim(p_contact_name);
  p_contact_phone := btrim(p_contact_phone);
  p_message := btrim(p_message);

  IF p_contact_name IS NULL
    OR p_contact_phone IS NULL
    OR p_message IS NULL
    OR char_length(p_contact_name) NOT BETWEEN 2 AND 120
    OR char_length(p_contact_phone) NOT BETWEEN 6 AND 40
    OR char_length(p_message) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'Invalid contact submission.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id
      AND status = 'published'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Published property not found.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.contacts (
    property_id,
    contact_name,
    contact_phone,
    message,
    source
  )
  VALUES (
    p_property_id,
    p_contact_name,
    p_contact_phone,
    p_message,
    'detail'
  )
  RETURNING id INTO v_contact_id;

  RETURN v_contact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_public_report_trusted(
  p_property_id uuid,
  p_reporter_id uuid,
  p_reason text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  p_reason := btrim(p_reason);
  p_description := nullif(btrim(p_description), '');

  IF p_reason IS NULL
    OR char_length(p_reason) NOT BETWEEN 2 AND 80
    OR (p_description IS NOT NULL AND char_length(p_description) > 2000) THEN
    RAISE EXCEPTION 'Invalid report submission.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id
      AND status = 'published'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Published property not found.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.property_reports (
    property_id,
    reporter_id,
    reason,
    description,
    status
  )
  VALUES (
    p_property_id,
    p_reporter_id,
    p_reason,
    p_description,
    'pending'
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_report_trusted(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_report_trusted(uuid, uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_report_trusted(uuid, uuid, text, text) TO service_role;
