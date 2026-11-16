-- Verify that the shared client projection can be read by anon while the
-- legacy direct-contact column remains blocked by column-level grants.
BEGIN;
SET LOCAL ROLE anon;

SELECT id, title, location, description, zone_id, operation, property_type,
  price_usd, bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge,
  status, cover_tone, cover_image, images, coordinates, features, user_id
FROM public.properties
LIMIT 0;

DO $$ BEGIN
  BEGIN
    PERFORM contact_info FROM public.properties LIMIT 1;
    RAISE EXCEPTION 'anon_can_read_legacy_property_contact_info';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
ROLLBACK;
