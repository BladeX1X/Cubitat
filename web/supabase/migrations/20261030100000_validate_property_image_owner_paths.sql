-- Storage object references on a property must stay inside its owner's folder.
-- This trigger applies to API, Worker, admin, and migration writes so callers
-- cannot bypass the invariant by writing properties through PostgREST directly.
CREATE OR REPLACE FUNCTION public.guard_property_image_owner_paths()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  image_url text;
  path_parts text[];
BEGIN
  FOREACH image_url IN ARRAY coalesce(NEW.images, ARRAY[]::text[]) || ARRAY[NEW.cover_image]
  LOOP
    IF image_url IS NULL THEN
      CONTINUE;
    END IF;

    path_parts := pg_catalog.regexp_match(
      image_url,
      '/storage/v1/object/(public/)?property_images/([^/?#]+)/([^/?#]+)',
      'i'
    );
    IF path_parts IS NOT NULL AND path_parts[2] IS DISTINCT FROM NEW.user_id::text THEN
      RAISE EXCEPTION 'Property image owner mismatch' USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_property_image_owner_paths()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_property_image_owner_paths_trigger ON public.properties;
CREATE TRIGGER guard_property_image_owner_paths_trigger
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.guard_property_image_owner_paths();
