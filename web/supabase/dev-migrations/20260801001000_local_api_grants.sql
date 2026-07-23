-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.
-- Reproduce the API grants that already exist in the historical production
-- project but were not captured by the earliest schema migrations.
-- RLS remains the authorization boundary for every granted operation.

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.properties TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.saved_properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.search_alerts TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.property_reports TO authenticated;
