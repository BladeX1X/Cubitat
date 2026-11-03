-- Keep internal moderation feedback private on otherwise public listings.
-- RLS controls which rows anon can read; these grants separately restrict fields.
BEGIN;
REVOKE SELECT ON TABLE public.properties FROM PUBLIC, anon;
REVOKE SELECT (phone_clicks_count, whatsapp_clicks_count)
  ON TABLE public.properties FROM PUBLIC, anon;
GRANT SELECT (
  id, title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge, status,
  cover_tone, cover_image, coordinates, created_at, updated_at, user_id, images,
  features, contact_info, view_count
) ON TABLE public.properties TO anon;
COMMIT;
