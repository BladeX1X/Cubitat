-- Backfill production KYC evidence retention for terminal requests that existed
-- before the retention migration added evidence_purge_after.
-- This migration only fills missing schedules and never changes evidence paths.

BEGIN;
UPDATE public.kyc_requests
SET evidence_purge_after = updated_at + interval '24 hours'
WHERE status IN ('approved', 'rejected')
  AND evidence_purge_after IS NULL
  AND evidence_purged_at IS NULL
  AND (document_path IS NOT NULL OR selfie_path IS NOT NULL);
COMMIT;
