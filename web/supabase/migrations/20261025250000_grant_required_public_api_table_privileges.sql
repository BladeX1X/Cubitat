-- Make the client API work on fresh projects where public-table auto-exposure
-- is disabled. Grants are the object boundary; existing RLS policies continue
-- to decide which rows each role may access.
BEGIN;

-- No API key needs table-wide data destruction; remove legacy grants too.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public
FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.properties,
  public.profiles,
  public.saved_properties,
  public.notifications,
  public.search_alerts,
  public.contacts,
  public.property_reports,
  public.push_subscriptions,
  public.notification_push_deliveries,
  public.kyc_requests,
  public.property_verification_requests
FROM PUBLIC, anon, authenticated, service_role;

-- Public catalog reads are limited to published rows by RLS and an explicit
-- column allowlist. Keep this first grant narrow so a later migration cannot
-- leave contact/moderation fields exposed if deployment stops between files.
GRANT SELECT (
  id, title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge, status,
  cover_tone, cover_image, coordinates, created_at, updated_at, user_id, images,
  features, view_count
) ON TABLE public.properties TO anon;
GRANT SELECT (
  id, title, location, description, zone_id, operation, property_type, price_usd,
  bedrooms, bathrooms, parking, area_m2, age_years, amenities, badge, status,
  cover_tone, cover_image, coordinates, created_at, updated_at, user_id, images,
  features, moderation_message, view_count
) ON TABLE public.properties TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.properties TO authenticated;
-- Trusted Workers use narrow projections for image duplicate checks and SEO.
GRANT SELECT (id, user_id, status, cover_image, images)
  ON TABLE public.properties TO service_role;

-- Profile reads remain authenticated and row-scoped. Re-grant only the account
-- fields allowed by the preceding column-level hardening migration.
GRANT SELECT ON TABLE public.profiles TO authenticated;
-- The alert email dispatcher resolves recipients by profile id and email only.
GRANT SELECT (id, email) ON TABLE public.profiles TO service_role;
GRANT UPDATE (full_name, phone, avatar_url, role, public_whatsapp_enabled)
  ON TABLE public.profiles TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.saved_properties TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;
-- The alert email dispatcher may update its delivery fields, not user content.
GRANT SELECT (id) ON TABLE public.notifications TO service_role;
GRANT UPDATE (email_delivery_status, email_sent_at)
  ON TABLE public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_alerts TO authenticated;
GRANT SELECT ON TABLE public.contacts TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.property_reports TO authenticated;
GRANT SELECT ON TABLE public.push_subscriptions TO authenticated;
GRANT SELECT ON TABLE public.kyc_requests TO authenticated;
GRANT SELECT ON TABLE public.property_verification_requests TO authenticated;

-- The Worker validates the caller before using its server-only service key.
-- PostgREST upsert requires table-level SELECT for ON CONFLICT, and the trusted
-- dispatcher already reads keys through claim_pending_push_deliveries().
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.push_subscriptions TO service_role;

-- Queue rows are created by a trigger and claimed through privileged RPCs. The
-- dispatcher only filters by these columns and changes status/sent_at.
GRANT SELECT (id, status, attempts)
  ON TABLE public.notification_push_deliveries TO service_role;
GRANT UPDATE (status, sent_at)
  ON TABLE public.notification_push_deliveries TO service_role;

COMMIT;
