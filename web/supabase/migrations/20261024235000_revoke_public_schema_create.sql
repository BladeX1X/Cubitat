-- API roles may use objects exposed through Data API, but must never create
-- shadow objects in public. This also hardens SECURITY DEFINER functions that
-- still have a pinned search_path containing public.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM anon, authenticated, service_role;
