-- Production KYC evidence retention: both approved and rejected evidence expire after 24 hours.
-- Storage deletion is performed only by the server-side Worker.

ALTER TABLE public.kyc_requests
  ALTER COLUMN document_path DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS evidence_purge_after timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_purge_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_purged_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_purge_attempts integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.schedule_kyc_evidence_purge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected')
    AND (OLD.status IS DISTINCT FROM NEW.status OR NEW.evidence_purge_after IS NULL)
    AND (NEW.document_path IS NOT NULL OR NEW.selfie_path IS NOT NULL) THEN
    NEW.evidence_purge_after := now() + interval '24 hours';
    NEW.evidence_purge_claimed_at := NULL;
    NEW.evidence_purged_at := NULL;
    NEW.evidence_purge_attempts := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schedule_kyc_evidence_purge ON public.kyc_requests;
CREATE TRIGGER schedule_kyc_evidence_purge
BEFORE INSERT OR UPDATE OF status, document_path, selfie_path
ON public.kyc_requests
FOR EACH ROW EXECUTE FUNCTION public.schedule_kyc_evidence_purge();

CREATE INDEX IF NOT EXISTS kyc_requests_evidence_purge_due_idx
  ON public.kyc_requests (evidence_purge_after)
  WHERE evidence_purged_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_kyc_evidence_for_purge(p_limit integer DEFAULT 25)
RETURNS TABLE (id uuid, document_path text, selfie_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 25 THEN
    RAISE EXCEPTION 'KYC purge batch size must be between 1 and 25.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT r.id
    FROM public.kyc_requests r
    WHERE r.evidence_purge_after <= now()
      AND r.evidence_purged_at IS NULL
      AND (r.evidence_purge_claimed_at IS NULL
        OR r.evidence_purge_claimed_at < now() - interval '30 minutes')
      AND (r.document_path IS NOT NULL OR r.selfie_path IS NOT NULL)
    ORDER BY r.evidence_purge_after, r.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.kyc_requests r
  SET evidence_purge_claimed_at = now(),
      evidence_purge_attempts = r.evidence_purge_attempts + 1
  FROM candidates
  WHERE r.id = candidates.id
  RETURNING r.id, r.document_path, r.selfie_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_kyc_evidence_purge(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.kyc_requests
  SET document_path = NULL,
      selfie_path = NULL,
      evidence_purge_claimed_at = NULL,
      evidence_purged_at = now()
  WHERE id = p_request_id
    AND evidence_purged_at IS NULL
    AND evidence_purge_claimed_at IS NOT NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_kyc_evidence_purge(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.kyc_requests
  SET evidence_purge_claimed_at = NULL
  WHERE id = p_request_id
    AND evidence_purged_at IS NULL;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_kyc_evidence_for_purge(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_kyc_evidence_purge(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_kyc_evidence_purge(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_kyc_evidence_for_purge(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_kyc_evidence_purge(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_kyc_evidence_purge(uuid) TO service_role;

COMMENT ON TABLE public.kyc_requests IS
  'KYC evidence is retained for 24 hours after approval or rejection, then removed by the server-side retention Worker.';

NOTIFY pgrst, 'reload schema';
