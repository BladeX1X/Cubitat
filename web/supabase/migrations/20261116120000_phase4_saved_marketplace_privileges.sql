-- Clear permissive schema-default grants so marketplace favorites remain private.
BEGIN;

REVOKE ALL ON TABLE public.saved_marketplace_listings
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.saved_marketplace_listings TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
