-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.
-- Migration: 20260801006000_rejected_kyc_evidence_retention.sql
-- Description: extiende la purga segura a evidencias KYC rechazadas despues
-- de una hora, manteniendo 24 horas para las aprobadas.

BEGIN;

CREATE OR REPLACE FUNCTION public.schedule_approved_kyc_evidence_purge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.evidence_purge_after := now() + interval '24 hours';
    NEW.evidence_purge_claimed_at := NULL;
    NEW.evidence_purged_at := NULL;
    NEW.evidence_purge_attempts := 0;
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.evidence_purge_after := now() + interval '1 hour';
    NEW.evidence_purge_claimed_at := NULL;
    NEW.evidence_purged_at := NULL;
    NEW.evidence_purge_attempts := 0;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.kyc_requests
SET evidence_purge_after = updated_at + interval '1 hour'
WHERE status = 'rejected'
  AND evidence_purged_at IS NULL
  AND evidence_purge_after IS NULL
  AND (document_path IS NOT NULL OR selfie_path IS NOT NULL);

DROP INDEX IF EXISTS public.kyc_requests_evidence_purge_due_idx;
CREATE INDEX kyc_requests_evidence_purge_due_idx
  ON public.kyc_requests (evidence_purge_after)
  WHERE status IN ('approved', 'rejected')
    AND evidence_purged_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_kyc_evidence_for_purge(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  document_path text,
  selfie_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT r.id
    FROM public.kyc_requests r
    WHERE r.status IN ('approved', 'rejected')
      AND r.evidence_purged_at IS NULL
      AND r.evidence_purge_after <= now()
      AND r.document_path IS NOT NULL
      AND r.selfie_path IS NOT NULL
      AND (
        r.evidence_purge_claimed_at IS NULL
        OR r.evidence_purge_claimed_at < now() - interval '30 minutes'
      )
    ORDER BY r.evidence_purge_after, r.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.kyc_requests r
  SET evidence_purge_claimed_at = now(),
      evidence_purge_attempts = r.evidence_purge_attempts + 1
  FROM candidates
  WHERE r.id = candidates.id
  RETURNING r.id, r.document_path, r.selfie_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_kyc_evidence_purge(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_document_path text;
  v_selfie_path text;
BEGIN
  SELECT r.document_path, r.selfie_path
  INTO v_document_path, v_selfie_path
  FROM public.kyc_requests r
  WHERE r.id = p_request_id
    AND r.status IN ('approved', 'rejected')
    AND r.evidence_purged_at IS NULL
    AND r.evidence_purge_claimed_at IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud KYC no reclamada para purga';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'kyc_documents'
      AND o.name IN (v_document_path, v_selfie_path)
  ) THEN
    RAISE EXCEPTION 'Las evidencias KYC siguen presentes en Storage';
  END IF;

  UPDATE public.kyc_requests
  SET document_path = NULL,
      selfie_path = NULL,
      evidence_purge_claimed_at = NULL,
      evidence_purged_at = now()
  WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_kyc_evidence_purge(
  p_request_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  UPDATE public.kyc_requests
  SET evidence_purge_claimed_at = NULL
  WHERE id = p_request_id
    AND status IN ('approved', 'rejected')
    AND evidence_purged_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.claim_kyc_evidence_for_purge(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_kyc_evidence_purge(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_kyc_evidence_purge(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_kyc_evidence_for_purge(integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_kyc_evidence_purge(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_kyc_evidence_purge(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_approved_kyc_evidence_for_purge(integer)
  FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.claim_approved_kyc_evidence_for_purge(integer);

COMMIT;
