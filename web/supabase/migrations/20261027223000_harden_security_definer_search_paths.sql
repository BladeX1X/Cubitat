-- Pin SECURITY DEFINER functions with legacy definitions to a trusted search path.
-- Public object references in their bodies are already schema-qualified.
BEGIN;
ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog;
-- Retired from API execution, but retain defense in depth if a future grant is added.
ALTER FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text)
  SET search_path = pg_catalog;
COMMIT;
