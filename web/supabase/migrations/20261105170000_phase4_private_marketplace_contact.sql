-- Keep seller phone numbers out of anonymous/authenticated PostgREST reads.
-- The public Worker reveals them only after Turnstile verification.

REVOKE SELECT ON TABLE public.home_service_providers FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, slug, display_name, category, description, province,
  municipalities, gallery_urls, status, created_at, updated_at)
  ON public.home_service_providers TO anon, authenticated;

REVOKE SELECT ON TABLE public.material_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, slug, title, category, description, price, currency,
  province, availability, photo_urls, status, created_at, updated_at)
  ON public.material_listings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_marketplace_contact(
  p_listing_type text,
  p_listing_id uuid
)
RETURNS TABLE (phone text, whatsapp text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_listing_type = 'service' THEN
    RETURN QUERY
      SELECT provider.phone, provider.whatsapp
      FROM public.home_service_providers AS provider
      WHERE provider.id = p_listing_id
        AND provider.status = 'published'
        AND (provider.phone IS NOT NULL OR provider.whatsapp IS NOT NULL);
  ELSIF p_listing_type = 'material' THEN
    RETURN QUERY
      SELECT listing.phone, listing.whatsapp
      FROM public.material_listings AS listing
      WHERE listing.id = p_listing_id
        AND listing.status = 'published'
        AND listing.availability <> 'out_of_stock'
        AND (listing.phone IS NOT NULL OR listing.whatsapp IS NOT NULL);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_marketplace_contact(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_contact(text, uuid)
  TO service_role;
