-- Cap user/admin text persisted through SECURITY DEFINER verification RPCs.

CREATE OR REPLACE FUNCTION public.submit_property_verification(
  p_property_id uuid,
  p_document_type text,
  p_document_path text,
  p_notes text DEFAULT NULL
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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
  IF p_notes IS NOT NULL AND (
    char_length(btrim(p_notes)) > 1000 OR octet_length(p_notes) > 4096
  ) THEN RAISE EXCEPTION 'Las notas no pueden exceder 1000 caracteres'; END IF;
  IF p_document_type NOT IN ('ownership_title', 'purchase_contract', 'other') THEN
    RAISE EXCEPTION 'Tipo de documento no valido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.properties WHERE id = p_property_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'La propiedad no pertenece al usuario'; END IF;
  IF p_document_path IS NULL
    OR p_document_path NOT LIKE v_user_id::text || '/property-' || p_property_id::text || '/%'
    OR p_document_path LIKE '%..%'
    OR length(p_document_path) > 300 THEN
    RAISE EXCEPTION 'Ruta de documento no valida';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'property_documents' AND name = p_document_path
  ) THEN RAISE EXCEPTION 'Documento de propiedad no encontrado'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.property_verification_requests
    WHERE property_id = p_property_id AND status = 'pending'
  ) THEN RAISE EXCEPTION 'Ya existe una solicitud pendiente para esta propiedad'; END IF;
  INSERT INTO public.property_verification_requests (
    property_id, owner_id, document_type, document_path, notes
  ) VALUES (
    p_property_id, v_user_id, p_document_type, p_document_path, NULLIF(btrim(p_notes), '')
  ) RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_property_verification(
  p_request_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Permiso denegado: se requiere administrador AAL2';
  END IF;
  IF p_reason IS NOT NULL AND (
    char_length(btrim(p_reason)) > 1000 OR octet_length(p_reason) > 4096
  ) THEN RAISE EXCEPTION 'El motivo no puede exceder 1000 caracteres'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Estado de revision no valido';
  END IF;
  IF p_status = 'rejected' AND NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'El rechazo requiere un motivo';
  END IF;
  UPDATE public.property_verification_requests
  SET status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc'::text, now()),
      rejection_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_reason) ELSE NULL END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud de propiedad no encontrada o ya procesada'; END IF;
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
  IF NOT public.is_admin_aal2() THEN RAISE EXCEPTION 'Permiso denegado'; END IF;
  IF p_reason IS NOT NULL AND (
    char_length(btrim(p_reason)) > 1000 OR octet_length(p_reason) > 4096
  ) THEN RAISE EXCEPTION 'El motivo no puede exceder 1000 caracteres'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Estado no valido'; END IF;
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
  ) THEN RAISE EXCEPTION 'La solicitud KYC no contiene las dos evidencias requeridas'; END IF;
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

REVOKE ALL ON FUNCTION public.submit_property_verification(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_property_verification(uuid, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_property_verification(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_property_verification(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_kyc_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_kyc_request(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
