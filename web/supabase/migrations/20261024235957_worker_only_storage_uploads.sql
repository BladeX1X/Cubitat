-- Make the application Worker the only upload gateway for production Storage.
-- The Worker validates the user's JWT, owner path and file signature before
-- forwarding with the server-only service key.

CREATE OR REPLACE FUNCTION public.guard_cubitat_storage_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner_text text := split_part(NEW.name, '/', 1);
  v_owner uuid;
  v_item_id uuid;
  v_owner_limit integer;
  v_count integer;
  v_existing_object_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.bucket_id IS DISTINCT FROM OLD.bucket_id OR NEW.name IS DISTINCT FROM OLD.name) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Storage object paths cannot be changed';
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Cubitat Storage uploads must use the trusted gateway';
  END IF;

  IF v_owner_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invalid Storage owner path';
  END IF;
  v_owner := v_owner_text::uuid;
  IF TG_OP = 'UPDATE' THEN
    v_existing_object_id := OLD.id;
  END IF;

  CASE NEW.bucket_id
    WHEN 'avatars' THEN
      v_owner_limit := 1;
      IF NEW.name !~* ('^' || v_owner::text || '/avatar[.]webp$') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invalid avatar path';
      END IF;
    WHEN 'property_images' THEN
      v_owner_limit := 200;
      IF NEW.name !~* ('^' || v_owner::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invalid property image path';
      END IF;
    WHEN 'kyc_documents' THEN
      v_owner_limit := 15;
      IF NEW.name !~* ('^' || v_owner::text || '/(document|selfie)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invalid KYC evidence path';
      END IF;
    WHEN 'property_documents' THEN
      v_owner_limit := 20;
      IF NEW.name !~* ('^' || v_owner::text || '/property-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9._-]{1,120}$') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invalid property evidence path';
      END IF;
      v_item_id := substring((storage.foldername(NEW.name))[2] FROM 10)::uuid;
      IF NOT EXISTS (
        SELECT 1 FROM public.properties property
        WHERE property.id = v_item_id AND property.user_id = v_owner
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Property evidence owner mismatch';
      END IF;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unsupported Cubitat upload bucket';
  END CASE;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_owner::text || ':' || NEW.bucket_id, 0));
  SELECT count(*)::integer INTO v_count
  FROM storage.objects object
  WHERE object.bucket_id = NEW.bucket_id
    AND (storage.foldername(object.name))[1] = v_owner::text
    AND (v_existing_object_id IS NULL OR object.id <> v_existing_object_id);
  IF v_count >= v_owner_limit THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Storage owner quota exceeded';
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION public.guard_cubitat_storage_upload() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.guard_cubitat_storage_upload() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS guard_cubitat_storage_upload ON storage.objects;
CREATE TRIGGER guard_cubitat_storage_upload
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id IN ('avatars', 'property_images', 'kyc_documents', 'property_documents'))
EXECUTE FUNCTION public.guard_cubitat_storage_upload();
DROP POLICY IF EXISTS "Owner avatar inserts" ON storage.objects;
DROP POLICY IF EXISTS "Owner property image inserts" ON storage.objects;
DROP POLICY IF EXISTS "KYC owner uploads own documents" ON storage.objects;
DROP POLICY IF EXISTS "Property owners upload own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Owner avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Owner property image updates" ON storage.objects;
-- Worker-created objects have no Storage owner_id; constrain client deletion
-- to the canonical account folder instead.
DROP POLICY IF EXISTS "Owner avatar deletes" ON storage.objects;
CREATE POLICY "Owner avatar deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND name = auth.uid()::text || '/avatar.webp');
DROP POLICY IF EXISTS "Owner property image deletes" ON storage.objects;
CREATE POLICY "Owner property image deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property_images'
  AND (storage.foldername(name))[1] = auth.uid()::text);
