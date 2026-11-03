-- Prevent authenticated users from demoting a verified profile by calling the
-- KYC submission RPC directly. A row lock serializes this check with reviews.
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
  v_verification_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT verification_status
  INTO v_verification_status
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_verification_status IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado';
  END IF;
  IF v_verification_status = 'verified' THEN
    RAISE EXCEPTION 'La cuenta ya está verificada';
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
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'kyc_documents' AND name = p_document_path
  ) THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'kyc_documents' AND name = p_selfie_path
  ) THEN
    RAISE EXCEPTION 'Foto sosteniendo el documento no encontrada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.kyc_requests
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
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

REVOKE ALL ON FUNCTION public.submit_kyc_request(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_request(text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
