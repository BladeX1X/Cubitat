-- Production KYC foundation. Idempotent and isolated from other Phase 2 modules.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' NOT NULL,
  ADD COLUMN IF NOT EXISTS verification_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'check_verification_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_verification_status
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('identity_card', 'passport')),
  document_path text NOT NULL,
  selfie_path text,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.kyc_requests
  ADD COLUMN IF NOT EXISTS selfie_path text;

CREATE UNIQUE INDEX IF NOT EXISTS kyc_requests_one_pending_per_user_idx
  ON public.kyc_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus propias solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Usuarios ven sus propias solicitudes KYC"
ON public.kyc_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins gestionan solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Admins gestionan solicitudes KYC"
ON public.kyc_requests FOR ALL TO authenticated
USING (public.is_admin_aal2())
WITH CHECK (public.is_admin_aal2());

REVOKE INSERT, UPDATE, DELETE ON public.kyc_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.kyc_requests TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc_documents', 'kyc_documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "KYC owner uploads own documents" ON storage.objects;
CREATE POLICY "KYC owner uploads own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "KYC owner reads own documents" ON storage.objects;
CREATE POLICY "KYC owner reads own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "KYC owner deletes own documents" ON storage.objects;
CREATE POLICY "KYC owner deletes own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "KYC admin AAL2 reads documents" ON storage.objects;
CREATE POLICY "KYC admin AAL2 reads documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc_documents' AND public.is_admin_aal2());

DROP FUNCTION IF EXISTS public.submit_kyc_request(text, text);
CREATE OR REPLACE FUNCTION public.submit_kyc_request(
  p_document_type text,
  p_document_path text,
  p_selfie_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  IF p_document_type NOT IN ('identity_card', 'passport') THEN
    RAISE EXCEPTION 'Tipo de documento de identidad no valido';
  END IF;
  IF p_document_path IS NULL
    OR p_document_path NOT LIKE v_user_id::text || '/document-%'
    OR p_document_path LIKE '%..%'
    OR length(p_document_path) > 300 THEN
    RAISE EXCEPTION 'Ruta de documento no valida';
  END IF;
  IF p_selfie_path IS NULL
    OR p_selfie_path NOT LIKE v_user_id::text || '/selfie-%'
    OR p_selfie_path LIKE '%..%'
    OR length(p_selfie_path) > 300
    OR p_selfie_path = p_document_path THEN
    RAISE EXCEPTION 'Ruta de foto de identidad no valida';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'kyc_documents' AND name = p_document_path) THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'kyc_documents' AND name = p_selfie_path) THEN
    RAISE EXCEPTION 'Foto sosteniendo el documento no encontrada';
  END IF;
  IF EXISTS (SELECT 1 FROM public.kyc_requests WHERE user_id = v_user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente';
  END IF;

  INSERT INTO public.kyc_requests (user_id, document_type, document_path, selfie_path)
  VALUES (v_user_id, p_document_type, p_document_path, p_selfie_path)
  RETURNING id INTO v_request_id;

  PERFORM set_config('app.kyc_internal', 'true', true);
  UPDATE public.profiles
  SET verification_status = 'pending', verification_reason = NULL
  WHERE id = v_user_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_kyc_request(
  p_request_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_target_user_id uuid;
  v_document_path text;
  v_selfie_path text;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Permiso denegado';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Estado no valido';
  END IF;
  IF p_status = 'rejected' AND NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'El rechazo requiere un motivo';
  END IF;

  SELECT user_id, document_path, selfie_path
  INTO v_target_user_id, v_document_path, v_selfie_path
  FROM public.kyc_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitud KYC no encontrada o ya procesada';
  END IF;
  IF p_status = 'approved' AND (
    v_selfie_path IS NULL
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'kyc_documents' AND name = v_document_path)
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'kyc_documents' AND name = v_selfie_path)
  ) THEN
    RAISE EXCEPTION 'La solicitud KYC no contiene las dos evidencias requeridas';
  END IF;

  UPDATE public.kyc_requests
  SET status = p_status,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_reason) ELSE NULL END,
      updated_at = now()
  WHERE id = p_request_id;
  PERFORM set_config('app.kyc_internal', 'true', true);
  UPDATE public.profiles
  SET verification_status = CASE WHEN p_status = 'approved' THEN 'verified' ELSE 'rejected' END,
      verification_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_reason) ELSE NULL END
  WHERE id = v_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_kyc_request(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_kyc_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_request(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_kyc_request(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
