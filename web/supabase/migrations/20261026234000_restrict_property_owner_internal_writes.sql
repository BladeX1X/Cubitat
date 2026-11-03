-- Keep owner edits within advertiser-controlled fields. Internal moderation,
-- trust markers, identity, and engagement counters remain server controlled.

REVOKE INSERT ON TABLE public.properties FROM PUBLIC, anon, authenticated;
REVOKE INSERT (
  id, title, location, description, zone_id, operation, property_type,
  price_usd, bedrooms, bathrooms, parking, area_m2, age_years, amenities,
  badge, status, cover_tone, cover_image, coordinates, created_at, updated_at,
  user_id, images, features, contact_info, moderation_message,
  view_count, phone_clicks_count, whatsapp_clicks_count
) ON TABLE public.properties FROM PUBLIC, anon, authenticated;

GRANT INSERT (
  title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, status,
  cover_image, coordinates, user_id, images, features, contact_info,
  moderation_message
) ON TABLE public.properties TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_property_owner_internal_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  -- SECURITY DEFINER visibility RPCs, the Worker, migrations, and trusted
  -- service operations are not owner-facing Data API writes.
  IF current_user <> 'authenticated' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Administrators can change trust and moderation fields only with AAL2.
  IF public.is_admin_aal2() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.badge IS NOT NULL
      OR NEW.cover_tone IS DISTINCT FROM '#f3f4f6'
      OR coalesce(NEW.view_count, 0) <> 0
      OR coalesce(NEW.phone_clicks_count, 0) <> 0
      OR coalesce(NEW.whatsapp_clicks_count, 0) <> 0
      OR NEW.moderation_message IS NOT NULL THEN
      RAISE EXCEPTION 'Property internal fields are server controlled.' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := timezone('utc'::text, now());
    NEW.updated_at := NEW.created_at;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.badge IS DISTINCT FROM OLD.badge
    OR NEW.cover_tone IS DISTINCT FROM OLD.cover_tone
    OR NEW.view_count IS DISTINCT FROM OLD.view_count
    OR NEW.phone_clicks_count IS DISTINCT FROM OLD.phone_clicks_count
    OR NEW.whatsapp_clicks_count IS DISTINCT FROM OLD.whatsapp_clicks_count
    OR (NEW.moderation_message IS DISTINCT FROM OLD.moderation_message
      AND NEW.moderation_message IS NOT NULL) THEN
    RAISE EXCEPTION 'Property internal fields are server controlled.' USING ERRCODE = '42501';
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_property_owner_internal_fields()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_property_owner_internal_fields_trigger ON public.properties;
CREATE TRIGGER guard_property_owner_internal_fields_trigger
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.guard_property_owner_internal_fields();
