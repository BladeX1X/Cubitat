-- The client assigns a stable provider ID so an ambiguous first INSERT can be
-- retried against the same draft. Keep the existing owner/status RLS policy
-- and grant INSERT only on this additional column.
BEGIN;

GRANT INSERT (id)
  ON public.home_service_providers
  TO authenticated;

COMMIT;
