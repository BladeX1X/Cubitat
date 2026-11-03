-- Contact data lives in property_contact_details; do not expose the legacy JSON
-- column through the Data API to anonymous or authenticated catalog clients.
-- Run after 20261025160000_separate_property_contact_details.sql has completed.
BEGIN;

REVOKE SELECT ON TABLE public.properties
  FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  id, title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge, status,
  cover_tone, cover_image, coordinates, created_at, updated_at, user_id, images,
  features, contact_info, moderation_message, view_count,
  phone_clicks_count, whatsapp_clicks_count
) ON TABLE public.properties
  FROM PUBLIC, anon, authenticated;

-- Anonymous catalog: only fields intended for a public listing.
GRANT SELECT (
  id, title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge, status,
  cover_tone, cover_image, coordinates, created_at, updated_at, user_id, images,
  features, view_count
) ON TABLE public.properties TO anon;

-- Authenticated owner/admin flows may read moderation feedback, but contacts
-- and contact counters remain available only through private/Worker paths.
GRANT SELECT (
  id, title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge, status,
  cover_tone, cover_image, coordinates, created_at, updated_at, user_id, images,
  features, moderation_message, view_count
) ON TABLE public.properties TO authenticated;

COMMIT;
