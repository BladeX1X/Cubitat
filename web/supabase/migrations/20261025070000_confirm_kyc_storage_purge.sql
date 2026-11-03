-- Keep KYC evidence references until Storage confirms both files are gone.
DROP FUNCTION IF EXISTS public.complete_kyc_evidence_purge(uuid);

CREATE OR REPLACE FUNCTION public.complete_kyc_evidence_purge(p_request_id uuid)
RETURNS boolean
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
    RETURN false;
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

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_kyc_evidence_purge(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_kyc_evidence_purge(uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
