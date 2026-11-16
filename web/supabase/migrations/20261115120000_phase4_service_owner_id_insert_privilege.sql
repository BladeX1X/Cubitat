-- Allow owners to supply a stable provider ID for idempotent publication retries.
-- All other ownership and listing fields remain controlled by existing RLS.
BEGIN;

GRANT INSERT (id)
  ON public.home_service_providers
  TO authenticated;

COMMIT;
