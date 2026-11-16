-- Persist private favorites for home services and materials.
BEGIN;

CREATE TABLE public.saved_marketplace_listings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_provider_id uuid REFERENCES public.home_service_providers(id) ON DELETE CASCADE,
  material_listing_id uuid REFERENCES public.material_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_marketplace_listings_exactly_one_target
    CHECK ((service_provider_id IS NOT NULL) <> (material_listing_id IS NOT NULL))
);

CREATE UNIQUE INDEX saved_marketplace_listings_service_unique
  ON public.saved_marketplace_listings (user_id, service_provider_id)
  WHERE service_provider_id IS NOT NULL;
CREATE UNIQUE INDEX saved_marketplace_listings_material_unique
  ON public.saved_marketplace_listings (user_id, material_listing_id)
  WHERE material_listing_id IS NOT NULL;

ALTER TABLE public.saved_marketplace_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.saved_marketplace_listings FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.saved_marketplace_listings TO authenticated;

CREATE POLICY saved_marketplace_listings_owner_select
  ON public.saved_marketplace_listings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY saved_marketplace_listings_owner_insert
  ON public.saved_marketplace_listings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY saved_marketplace_listings_owner_delete
  ON public.saved_marketplace_listings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
COMMIT;
