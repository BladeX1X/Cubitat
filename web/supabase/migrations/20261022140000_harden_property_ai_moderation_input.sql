-- AI moderation must use the exact property revision that was evaluated.
-- This function is the only write path used by the property AI Worker.
CREATE OR REPLACE FUNCTION public.apply_property_ai_moderation_trusted(
  p_property_id uuid,
  p_expected_status public.property_status,
  p_expected_updated_at timestamptz,
  p_status public.property_status,
  p_message text DEFAULT NULL,
  p_provider text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.';
  END IF;

  IF p_expected_status IS NULL OR p_status IS NULL OR p_expected_status NOT IN (
    'pending_review'::public.property_status,
    'ai_approved'::public.property_status,
    'ai_rejected'::public.property_status
  ) OR p_status NOT IN (
    'pending_review'::public.property_status,
    'ai_approved'::public.property_status,
    'ai_rejected'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Invalid moderation status.' USING ERRCODE = '22023';
  END IF;

  IF p_expected_updated_at IS NULL
    OR char_length(coalesce(p_message, '')) > 2000
    OR (p_provider IS NOT NULL AND p_provider NOT IN ('groq')) THEN
    RAISE EXCEPTION 'Invalid moderation metadata.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('cubitat.audit_source', CASE WHEN p_provider IS NULL THEN 'system' ELSE 'automation' END, true);
  PERFORM set_config('cubitat.audit_provider', coalesce(p_provider, ''), true);

  UPDATE public.properties
  SET status = p_status,
      moderation_message = p_message,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id
    AND status = p_expected_status
    AND updated_at = p_expected_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found or moderation result is stale.' USING ERRCODE = '40001';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_property_ai_moderation_trusted(uuid, public.property_status, timestamptz, public.property_status, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_property_ai_moderation_trusted(uuid, public.property_status, timestamptz, public.property_status, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_property_ai_moderation_trusted(uuid, public.property_status, timestamptz, public.property_status, text, text) TO service_role;
