-- Purge private application documents 30 days after a final decision.

ALTER TABLE public.agent_applications
  ALTER COLUMN cv_path DROP NOT NULL,
  ALTER COLUMN diploma_path DROP NOT NULL,
  ADD COLUMN evidence_purge_last_error_code text
    CHECK (evidence_purge_last_error_code IS NULL OR char_length(evidence_purge_last_error_code) <= 64);

-- Keep application data readable under existing RLS, but expose file paths only
-- through the AAL2 document-link endpoint and service-role maintenance RPCs.
REVOKE SELECT ON public.agent_applications FROM authenticated;
GRANT SELECT (
  id, user_id, province, education_title, experience_summary, status,
  final_decision_at, evidence_delete_after, evidence_purged_at, created_at, updated_at
) ON public.agent_applications TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_agent_application_evidence_for_purge(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  cv_path text,
  diploma_path text,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT application.id
    FROM public.agent_applications application
    WHERE application.status IN ('approved', 'rejected')
      AND application.evidence_delete_after <= now()
      AND application.evidence_purged_at IS NULL
      AND application.cv_path IS NOT NULL
      AND application.diploma_path IS NOT NULL
      AND application.evidence_purge_attempts < 3
      AND (application.evidence_purge_claimed_at IS NULL
        OR application.evidence_purge_claimed_at < now() - interval '30 minutes')
    ORDER BY application.evidence_delete_after, application.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(coalesce(p_limit, 10), 1), 10)
  ), claimed AS (
    UPDATE public.agent_applications application
    SET evidence_purge_attempts = application.evidence_purge_attempts + 1,
        evidence_purge_claimed_at = now(),
        evidence_purge_last_error_code = NULL,
        updated_at = now()
    FROM candidates
    WHERE application.id = candidates.id
    RETURNING application.id, application.user_id, application.cv_path,
      application.diploma_path, application.evidence_purge_attempts
  )
  SELECT claimed.id, claimed.user_id, claimed.cv_path, claimed.diploma_path,
    claimed.evidence_purge_attempts
  FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_agent_application_evidence_purge(p_application_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.agent_applications
  SET evidence_purged_at = now(), evidence_purge_claimed_at = NULL,
      cv_path = NULL, diploma_path = NULL,
      evidence_purge_last_error_code = NULL, updated_at = now()
  WHERE id = p_application_id
    AND evidence_purge_claimed_at IS NOT NULL
    AND evidence_purged_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_agent_application_evidence_purge(
  p_application_id uuid,
  p_error_code text DEFAULT 'storage_delete_failed'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.agent_applications
  SET evidence_purge_claimed_at = NULL,
      evidence_purge_last_error_code = left(coalesce(nullif(p_error_code, ''), 'storage_delete_failed'), 64),
      updated_at = now()
  WHERE id = p_application_id
    AND evidence_purge_claimed_at IS NOT NULL
    AND evidence_purged_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_agent_application_evidence_for_purge(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_agent_application_evidence_purge(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_agent_application_evidence_purge(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agent_application_evidence_for_purge(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_agent_application_evidence_purge(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_agent_application_evidence_purge(uuid, text) TO service_role;

COMMENT ON FUNCTION public.claim_agent_application_evidence_for_purge(integer) IS
  'Claims approved/rejected application documents after the 30-day retention period, with at most three safe retries.';

NOTIFY pgrst, 'reload schema';
