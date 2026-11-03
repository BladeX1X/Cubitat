-- Only the authenticated Worker gateway may upload Cubitat files. It validates
-- the user's JWT, canonical owner path, bounded body and file signature before
-- using the server-only service key. This trigger also enforces owner quotas.
CREATE OR REPLACE FUNCTION public.guard_cubitat_storage_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_owner_text text := split_part(NEW.name, '/', 1);
  v_owner uuid;
  v_property_id uuid;
  v_object_size bigint;
  v_object_count bigint;
  v_total_bytes bigint;
  v_max_objects bigint;
  v_max_bytes bigint;
  v_mime_type text := lower(coalesce(NEW.metadata ->> 'mimetype', ''));
  v_extension text := lower(split_part(NEW.name, '.', -1));
  v_existing_object_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Cubitat Storage uploads must use the trusted gateway.' USING ERRCODE = '42501';
  END IF;

  IF v_owner_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid Storage owner path.' USING ERRCODE = '42501';
  END IF;
  v_owner := v_owner_text::uuid;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.bucket_id IS DISTINCT FROM OLD.bucket_id OR NEW.name IS DISTINCT FROM OLD.name THEN
      RAISE EXCEPTION 'Storage object paths cannot be changed.' USING ERRCODE = '42501';
    END IF;
    v_existing_object_id := OLD.id;
  END IF;

  CASE NEW.bucket_id
    WHEN 'avatars' THEN
      v_max_objects := 1;
      v_max_bytes := 1048576;
      IF NEW.name !~* ('^' || v_owner::text || '/avatar[.]webp$')
        OR v_mime_type <> 'image/webp' OR v_extension <> 'webp' THEN
        RAISE EXCEPTION 'Invalid avatar upload.' USING ERRCODE = '22023';
      END IF;
    WHEN 'property_images' THEN
      v_max_objects := 100;
      v_max_bytes := 262144000;
      IF NEW.name !~* ('^' || v_owner::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
        OR v_mime_type <> 'image/webp' OR v_extension <> 'webp' THEN
        RAISE EXCEPTION 'Invalid property image upload.' USING ERRCODE = '22023';
      END IF;
    WHEN 'kyc_documents' THEN
      v_max_objects := 15;
      v_max_bytes := 157286400;
      IF NEW.name !~* ('^' || v_owner::text || '/(document|selfie)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$')
        OR NOT ((v_mime_type = 'image/jpeg' AND v_extension = 'jpg')
          OR (v_mime_type = 'image/png' AND v_extension = 'png')
          OR (v_mime_type = 'image/webp' AND v_extension = 'webp')) THEN
        RAISE EXCEPTION 'Invalid identity evidence upload.' USING ERRCODE = '22023';
      END IF;
    WHEN 'property_documents' THEN
      v_max_objects := 20;
      v_max_bytes := 104857600;
      IF NEW.name !~* ('^' || v_owner::text || '/property-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9._-]{1,120}$')
        OR NOT ((v_mime_type = 'application/pdf' AND v_extension = 'pdf')
          OR (v_mime_type = 'image/jpeg' AND v_extension IN ('jpg', 'jpeg'))
          OR (v_mime_type = 'image/png' AND v_extension = 'png')
          OR (v_mime_type = 'image/webp' AND v_extension = 'webp')) THEN
        RAISE EXCEPTION 'Invalid property evidence upload.' USING ERRCODE = '22023';
      END IF;
      v_property_id := substring((storage.foldername(NEW.name))[2] FROM 10)::uuid;
      IF NOT EXISTS (
        SELECT 1
        FROM public.properties AS property
        WHERE property.id = v_property_id
          AND property.user_id = v_owner
      ) THEN
        RAISE EXCEPTION 'Property evidence owner mismatch.' USING ERRCODE = '42501';
      END IF;
    ELSE
      RETURN NEW;
  END CASE;

  IF coalesce(NEW.metadata ->> 'size', '') !~ '^[0-9]{1,12}$' THEN
    RAISE EXCEPTION 'Storage upload size is missing or invalid.' USING ERRCODE = '22023';
  END IF;
  v_object_size := (NEW.metadata ->> 'size')::bigint;

  -- Serialize writes per account and bucket so concurrent uploads cannot race
  -- past count or aggregate-byte limits.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || ':' || NEW.bucket_id, 0)
  );

  SELECT count(*), coalesce(sum(
    CASE
      WHEN coalesce(stored_object.metadata ->> 'size', '') ~ '^[0-9]{1,12}$'
        THEN (stored_object.metadata ->> 'size')::bigint
      ELSE 0
    END
  ), 0)
  INTO v_object_count, v_total_bytes
  FROM storage.objects AS stored_object
  WHERE stored_object.bucket_id = NEW.bucket_id
    AND (storage.foldername(stored_object.name))[1] = v_owner::text
    AND (v_existing_object_id IS NULL OR stored_object.id <> v_existing_object_id);

  IF v_object_count >= v_max_objects OR v_total_bytes + v_object_size > v_max_bytes THEN
    RAISE EXCEPTION 'Storage owner quota exceeded.' USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.guard_cubitat_storage_upload() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.guard_cubitat_storage_upload() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_cubitat_storage_upload ON storage.objects;
CREATE TRIGGER guard_cubitat_storage_upload
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id IN ('avatars', 'property_images', 'kyc_documents', 'property_documents'))
EXECUTE FUNCTION public.guard_cubitat_storage_upload();

-- Worker-created objects do not carry the user's Storage owner_id; let users
-- delete only the objects in their exact account folder.
DROP POLICY IF EXISTS "Owner avatar inserts" ON storage.objects;
DROP POLICY IF EXISTS "Owner property image inserts" ON storage.objects;
DROP POLICY IF EXISTS "KYC owner uploads own documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners upload own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Owner avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Owner property image updates" ON storage.objects;
DROP POLICY IF EXISTS "Owner avatar deletes" ON storage.objects;
CREATE POLICY "Owner avatar deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND name = auth.uid()::text || '/avatar.webp');

DROP POLICY IF EXISTS "Owner property image deletes" ON storage.objects;
CREATE POLICY "Owner property image deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property_images' AND (storage.foldername(name))[1] = auth.uid()::text);
