-- This RPC belonged to an earlier marketplace implementation and is not
-- present in the current source tree. If an older database still has it,
-- remove all Data API roles from its unbounded listing-ID enumeration.
-- Keep the migration safe for clean installations where the RPC never existed.
DO $migration$
BEGIN
  IF pg_catalog.to_regprocedure('public.get_verified_phase4_listing_ids(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_verified_phase4_listing_ids(text) FROM PUBLIC, anon, authenticated, service_role';
  END IF;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
