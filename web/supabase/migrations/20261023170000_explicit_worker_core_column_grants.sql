-- Explicit minimum Data API privileges for Worker queries after Supabase's
-- 2026-10-30 change. These tables predate the change; this forward migration
-- also makes a fresh project/reset independent of automatic grants.
BEGIN;
GRANT SELECT (id, user_id, status, cover_image, images)
  ON TABLE public.properties TO service_role;
GRANT SELECT (id, email)
  ON TABLE public.profiles TO service_role;
GRANT SELECT (id), UPDATE (email_delivery_status, email_sent_at)
  ON TABLE public.notifications TO service_role;
COMMIT;
