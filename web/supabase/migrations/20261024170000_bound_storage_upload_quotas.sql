-- Bound authenticated direct uploads that bypass the application Worker.
-- Quotas are per owner and serialize concurrent uploads with a transaction lock.

CREATE OR REPLACE FUNCTION public.can_upload_bounded_storage_object(
  p_bucket text,
  p_name text,
  p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner uuid := auth.uid();
BEGIN
  IF v_owner IS NULL OR p_limit < 1
    OR p_bucket NOT IN ('property_images', 'property_documents', 'kyc_documents', 'avatars')
    OR (storage.foldername(p_name))[1] IS DISTINCT FROM v_owner::text THEN
    RETURN false;
  END IF;

  -- Serialize the quota check and insert for this owner/bucket transaction.
  PERFORM pg_advisory_xact_lock(hashtext(v_owner::text || ':' || p_bucket));

  RETURN (
    SELECT count(*) < p_limit
    FROM storage.objects object
    WHERE object.bucket_id = p_bucket
      AND object.name LIKE v_owner::text || '/%'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.can_upload_bounded_storage_object(text, text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.can_upload_avatar(p_name text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner uuid := auth.uid();
BEGIN
  IF v_owner IS NULL OR p_name IS DISTINCT FROM v_owner::text || '/avatar.webp' THEN
    RETURN false;
  END IF;
  RETURN public.can_upload_bounded_storage_object('avatars', p_name, 1);
END;
$$;
REVOKE ALL ON FUNCTION public.can_upload_avatar(text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_upload_avatar(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_upload_kyc_evidence(p_name text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner uuid := auth.uid();
BEGIN
  IF v_owner IS NULL OR p_name !~* (
    '^' || v_owner::text || '/(document|selfie)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) THEN
    RETURN false;
  END IF;
  RETURN public.can_upload_bounded_storage_object('kyc_documents', p_name, 15);
END;
$$;
REVOKE ALL ON FUNCTION public.can_upload_kyc_evidence(text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_upload_kyc_evidence(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_upload_property_image(p_name text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner uuid := auth.uid();
BEGIN
  IF v_owner IS NULL OR p_name !~* (
    '^' || v_owner::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  ) THEN
    RETURN false;
  END IF;
  RETURN public.can_upload_bounded_storage_object('property_images', p_name, 200);
END;
$$;
REVOKE ALL ON FUNCTION public.can_upload_property_image(text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_upload_property_image(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_upload_property_document(p_name text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_property_folder text;
BEGIN
  IF v_owner IS NULL OR p_name !~* (
    '^' || v_owner::text || '/property-[0-9a-f-]{36}/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}-[a-z0-9._-]{1,120}$'
  ) THEN
    RETURN false;
  END IF;

  v_property_folder := (storage.foldername(p_name))[2];
  IF NOT EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.id::text = substring(v_property_folder FROM 10)
      AND property.user_id = v_owner
  ) THEN
    RETURN false;
  END IF;

  RETURN public.can_upload_bounded_storage_object('property_documents', p_name, 20);
END;
$$;
REVOKE ALL ON FUNCTION public.can_upload_property_document(text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_upload_property_document(text) TO authenticated;
DROP POLICY IF EXISTS "Owner property image inserts" ON storage.objects;
CREATE POLICY "Owner property image inserts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property_images'
  AND public.can_upload_property_image(name)
);
DROP POLICY IF EXISTS "KYC owner uploads own documents" ON storage.objects;
CREATE POLICY "KYC owner uploads own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc_documents'
  AND public.can_upload_kyc_evidence(name)
);
DROP POLICY IF EXISTS "Property owners upload own evidence" ON storage.objects;
CREATE POLICY "Property owners upload own evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property_documents'
  AND public.can_upload_property_document(name)
);
DROP POLICY IF EXISTS "Owner avatar inserts" ON storage.objects;
CREATE POLICY "Owner avatar inserts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.can_upload_avatar(name));
DROP POLICY IF EXISTS "Owner avatar updates" ON storage.objects;
CREATE POLICY "Owner avatar updates"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
  AND name = auth.uid()::text || '/avatar.webp'
)
WITH CHECK (
  bucket_id = 'avatars'
  AND owner = auth.uid()
  AND name = auth.uid()::text || '/avatar.webp'
);
