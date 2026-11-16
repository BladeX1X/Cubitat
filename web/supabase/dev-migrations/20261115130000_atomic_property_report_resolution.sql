-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT
-- Resolve a property report and hide its property as a single transaction.
-- The caller must hold an authenticated administrator session at AAL2.
CREATE OR REPLACE FUNCTION public.resolve_property_report(
  p_report_id uuid,
  p_property_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_report_property_id uuid;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.property_reports
  SET status = 'resolved'
  WHERE id = p_report_id
    AND property_id = p_property_id
    AND status = 'pending'
  RETURNING property_id INTO v_report_property_id;

  IF v_report_property_id IS NULL THEN
    RAISE EXCEPTION 'property_report_not_resolvable' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('cubitat.audit_source', 'admin', true);

  UPDATE public.properties
  SET status = 'paused',
      moderation_message = 'Ocultada por reportes de usuarios.'
  WHERE id = v_report_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reported_property_not_found' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_property_report(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_property_report(uuid, uuid) TO authenticated;
