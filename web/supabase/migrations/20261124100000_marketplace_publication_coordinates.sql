BEGIN;

ALTER TABLE public.home_service_providers
  ADD COLUMN coordinates jsonb;
ALTER TABLE public.material_listings
  ADD COLUMN coordinates jsonb;

CREATE TABLE public.home_service_private_coordinates (
  provider_id uuid PRIMARY KEY REFERENCES public.home_service_providers(id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  coordinates jsonb NOT NULL CHECK (jsonb_typeof(coordinates) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.material_private_coordinates (
  listing_id uuid PRIMARY KEY REFERENCES public.material_listings(id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  coordinates jsonb NOT NULL CHECK (jsonb_typeof(coordinates) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_service_private_coordinates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_private_coordinates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_service_private_coordinates,
  public.material_private_coordinates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.home_service_private_coordinates,
  public.material_private_coordinates TO authenticated;
GRANT ALL ON public.home_service_private_coordinates,
  public.material_private_coordinates TO service_role;

CREATE POLICY home_service_private_coordinates_owner_read
  ON public.home_service_private_coordinates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.home_service_providers provider
    WHERE provider.id = provider_id AND provider.owner_id = (SELECT auth.uid())
  ));
CREATE POLICY material_private_coordinates_owner_read
  ON public.material_private_coordinates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id = listing_id AND listing.owner_id = (SELECT auth.uid())
  ));

CREATE FUNCTION public.protect_marketplace_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  exact_coordinates jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.coordinates IS NOT DISTINCT FROM OLD.coordinates THEN
    RETURN NEW;
  END IF;

  exact_coordinates := public.normalize_property_coordinates_json(NEW.coordinates);
  IF exact_coordinates IS NULL THEN
    IF TG_TABLE_NAME = 'home_service_providers' THEN
      DELETE FROM public.home_service_private_coordinates WHERE provider_id = NEW.id;
    ELSIF TG_TABLE_NAME = 'material_listings' THEN
      DELETE FROM public.material_private_coordinates WHERE listing_id = NEW.id;
    END IF;
    NEW.coordinates := NULL;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'home_service_providers' THEN
    INSERT INTO public.home_service_private_coordinates (provider_id, coordinates)
    VALUES (NEW.id, exact_coordinates)
    ON CONFLICT (provider_id) DO UPDATE
    SET coordinates = EXCLUDED.coordinates, updated_at = now();
  ELSIF TG_TABLE_NAME = 'material_listings' THEN
    INSERT INTO public.material_private_coordinates (listing_id, coordinates)
    VALUES (NEW.id, exact_coordinates)
    ON CONFLICT (listing_id) DO UPDATE
    SET coordinates = EXCLUDED.coordinates, updated_at = now();
  END IF;

  NEW.coordinates := public.approximate_marketplace_coordinates(exact_coordinates);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_marketplace_coordinates() FROM PUBLIC;

CREATE FUNCTION public.approximate_marketplace_coordinates(raw_coordinates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  normalized jsonb := public.normalize_property_coordinates_json(raw_coordinates);
  latitude numeric;
  longitude numeric;
  grid numeric := 0.005;
BEGIN
  IF normalized IS NULL THEN RETURN NULL; END IF;
  latitude := (normalized ->> 'latitude')::numeric;
  longitude := (normalized ->> 'longitude')::numeric;
  RETURN jsonb_build_object(
    'latitude', round(latitude / grid) * grid,
    'longitude', round(longitude / grid) * grid
  );
END;
$$;
REVOKE ALL ON FUNCTION public.approximate_marketplace_coordinates(jsonb) FROM PUBLIC;

CREATE TRIGGER protect_home_service_coordinates
  BEFORE INSERT OR UPDATE OF coordinates ON public.home_service_providers
  FOR EACH ROW EXECUTE FUNCTION public.protect_marketplace_coordinates();
CREATE TRIGGER protect_material_coordinates
  BEFORE INSERT OR UPDATE OF coordinates ON public.material_listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_marketplace_coordinates();

-- Public Data API access stays column-scoped; only the rounded coordinates are
-- readable. The exact point is returned only through owner-scoped RPCs.
GRANT SELECT (coordinates) ON public.home_service_providers TO anon, authenticated;
GRANT INSERT (coordinates) ON public.home_service_providers TO authenticated;
GRANT SELECT (coordinates) ON public.material_listings TO anon, authenticated;
GRANT INSERT (coordinates) ON public.material_listings TO authenticated;

DROP FUNCTION public.get_my_home_service_providers();
CREATE FUNCTION public.get_my_home_service_providers()
RETURNS TABLE (
  id uuid, slug text, display_name text, category text, description text,
  province text, municipalities text[], phone text, whatsapp text,
  gallery_urls text[], status text, created_at timestamptz, updated_at timestamptz,
  coordinates jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT provider.id, provider.slug, provider.display_name, provider.category,
    provider.description, provider.province, provider.municipalities,
    provider.phone, provider.whatsapp, provider.gallery_urls, provider.status,
    provider.created_at, provider.updated_at,
    coalesce(private_coordinates.coordinates, provider.coordinates)
  FROM public.home_service_providers provider
  LEFT JOIN public.home_service_private_coordinates private_coordinates
    ON private_coordinates.provider_id = provider.id
  WHERE provider.owner_id = (SELECT auth.uid())
  ORDER BY provider.updated_at DESC LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_my_home_service_providers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_home_service_providers() TO authenticated;

DROP FUNCTION public.update_home_service_provider(
  uuid, text, text, text, text, text[], text, text, text[]
);
CREATE FUNCTION public.update_home_service_provider(
  p_id uuid, p_display_name text, p_category text, p_description text,
  p_province text, p_municipalities text[], p_phone text, p_whatsapp text,
  p_gallery_urls text[], p_coordinates jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.home_service_providers provider
    SET display_name = btrim(p_display_name), category = p_category,
        description = btrim(p_description), province = btrim(p_province),
        municipalities = coalesce(p_municipalities, '{}'), phone = p_phone,
        whatsapp = p_whatsapp, gallery_urls = coalesce(p_gallery_urls, '{}'),
        coordinates = p_coordinates, updated_at = now(),
        status = CASE WHEN provider.status IN ('rejected', 'paused')
          THEN 'pending_review' ELSE provider.status END
    WHERE provider.id = p_id AND provider.owner_id = (SELECT auth.uid())
      AND provider.status IN ('pending_review', 'rejected', 'paused');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_profile_not_editable' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_home_service_provider(
  uuid, text, text, text, text, text[], text, text, text[], jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_home_service_provider(
  uuid, text, text, text, text, text[], text, text, text[], jsonb
) TO authenticated;

DROP FUNCTION public.get_my_material_listings();
CREATE FUNCTION public.get_my_material_listings()
RETURNS TABLE (
  id uuid, slug text, title text, category text, description text, price numeric,
  currency text, province text, availability text, phone text, whatsapp text,
  photo_urls text[], status text, created_at timestamptz, updated_at timestamptz,
  coordinates jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT listing.id, listing.slug, listing.title, listing.category,
    listing.description, listing.price, listing.currency, listing.province,
    listing.availability, listing.phone, listing.whatsapp, listing.photo_urls,
    listing.status, listing.created_at, listing.updated_at,
    coalesce(private_coordinates.coordinates, listing.coordinates)
  FROM public.material_listings listing
  LEFT JOIN public.material_private_coordinates private_coordinates
    ON private_coordinates.listing_id = listing.id
  WHERE listing.owner_id = (SELECT auth.uid())
  ORDER BY listing.updated_at DESC LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_my_material_listings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_material_listings() TO authenticated;

DROP FUNCTION public.update_material_listing(
  uuid, text, text, text, numeric, text, text, text, text, text, text[]
);
CREATE FUNCTION public.update_material_listing(
  p_id uuid, p_title text, p_category text, p_description text, p_price numeric,
  p_currency text, p_province text, p_availability text, p_phone text,
  p_whatsapp text, p_photo_urls text[], p_coordinates jsonb
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
      province = btrim(p_province), availability = p_availability,
      phone = p_phone, whatsapp = p_whatsapp,
      photo_urls = coalesce(p_photo_urls, '{}'), coordinates = p_coordinates,
      status = 'pending_review', updated_at = now()
    WHERE listing.id = p_id AND listing.owner_id = (SELECT auth.uid())
      AND listing.status <> 'archived';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material_listing_not_editable' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_material_listing(
  uuid, text, text, text, numeric, text, text, text, text, text, text[], jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_material_listing(
  uuid, text, text, text, numeric, text, text, text, text, text, text[], jsonb
) TO authenticated;

COMMENT ON COLUMN public.home_service_providers.coordinates IS
  'Approximate public map point. The exact point is stored in home_service_private_coordinates.';
COMMENT ON COLUMN public.material_listings.coordinates IS
  'Approximate public map point. The exact point is stored in material_private_coordinates.';

COMMIT;
