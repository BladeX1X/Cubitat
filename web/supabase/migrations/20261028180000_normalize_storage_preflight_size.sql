-- Supabase Storage 1.84.19 inserts metadata.contentLength during object-row
-- preflight, before it writes metadata.size. Normalize only trusted gateway
-- writes so the existing quota guard can validate the real byte count.
CREATE OR REPLACE FUNCTION public.normalize_cubitat_storage_preflight_size()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_content_length text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.metadata ->> 'size', '') ~ '^[0-9]{1,12}$' THEN
    RETURN NEW;
  END IF;

  v_content_length := NEW.metadata ->> 'contentLength';
  IF coalesce(v_content_length, '') ~ '^[0-9]{1,12}$' THEN
    NEW.metadata := NEW.metadata || pg_catalog.jsonb_build_object('size', v_content_length::bigint);
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.normalize_cubitat_storage_preflight_size() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.normalize_cubitat_storage_preflight_size() FROM PUBLIC, anon, authenticated, service_role;

-- PostgreSQL fires same-event triggers alphabetically. The `aaa_` prefix makes
-- this normalizer run before `guard_cubitat_storage_upload` consumes NEW.size.
DROP TRIGGER IF EXISTS aaa_normalize_cubitat_storage_preflight_size ON storage.objects;
CREATE TRIGGER aaa_normalize_cubitat_storage_preflight_size
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id IN ('avatars', 'property_images', 'kyc_documents', 'property_documents'))
EXECUTE FUNCTION public.normalize_cubitat_storage_preflight_size();
