-- Store municipality separately so the materials catalog can filter actual
-- listing locations. Idempotent DDL allows DEV, which already applied the
-- same feature under its earlier local migration version, to align safely.
ALTER TABLE public.material_listings
  ADD COLUMN IF NOT EXISTS municipality text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'material_listings_municipality_length_check'
      AND conrelid = 'public.material_listings'::regclass
  ) THEN
    ALTER TABLE public.material_listings
      ADD CONSTRAINT material_listings_municipality_length_check
      CHECK (municipality IS NULL OR char_length(btrim(municipality)) BETWEEN 2 AND 100);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS material_listings_public_municipality_idx
  ON public.material_listings (province, municipality, category, updated_at DESC)
  WHERE status = 'published' AND availability <> 'out_of_stock';

GRANT SELECT (municipality) ON public.material_listings TO anon, authenticated;
GRANT INSERT (municipality) ON public.material_listings TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_material_listings_with_location()
RETURNS TABLE (
  id uuid, slug text, title text, category text, description text, price numeric,
  currency text, province text, municipality text, availability text, phone text,
  whatsapp text, photo_urls text[], status text, created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT listing.id, listing.slug, listing.title, listing.category,
    listing.description, listing.price, listing.currency, listing.province,
    listing.municipality, listing.availability, listing.phone, listing.whatsapp,
    listing.photo_urls, listing.status, listing.created_at, listing.updated_at
  FROM public.material_listings listing
  WHERE listing.owner_id = (SELECT auth.uid())
  ORDER BY listing.updated_at DESC LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_my_material_listings_with_location() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_material_listings_with_location() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_material_listing_with_location(
  p_id uuid, p_title text, p_category text, p_description text, p_price numeric,
  p_currency text, p_province text, p_municipality text,
  p_availability text, p_phone text, p_whatsapp text, p_photo_urls text[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.material_listings listing
    SET title = btrim(p_title), category = p_category,
      description = btrim(p_description), price = p_price, currency = p_currency,
      province = btrim(p_province), municipality = nullif(btrim(p_municipality), ''),
      availability = p_availability, phone = p_phone, whatsapp = p_whatsapp,
      photo_urls = coalesce(p_photo_urls, '{}'), status = 'pending_review',
      updated_at = now()
    WHERE listing.id = p_id AND listing.owner_id = (SELECT auth.uid())
      AND listing.status <> 'archived';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material_listing_not_editable' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_material_listing_with_location(
  uuid, text, text, text, numeric, text, text, text, text, text, text, text[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_material_listing_with_location(
  uuid, text, text, text, numeric, text, text, text, text, text, text, text[]
) TO authenticated;
