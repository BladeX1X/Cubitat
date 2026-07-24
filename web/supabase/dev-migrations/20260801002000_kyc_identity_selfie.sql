-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.
-- Migration: 20260801002000_kyc_identity_selfie.sql
-- Description: KYC exige documento de identidad y foto de la persona sosteniéndolo.

BEGIN;

ALTER TABLE public.kyc_requests
  ADD COLUMN IF NOT EXISTS selfie_path text;

-- Las solicitudes creadas con el flujo anterior no pueden aprobarse porque no
-- contienen la segunda evidencia. Se conservan como historial y el usuario
-- puede presentar una nueva solicitud completa.
SELECT set_config('app.kyc_internal', 'true', true);

UPDATE public.profiles p
SET verification_status = 'rejected',
    verification_reason = 'La solicitud debe enviarse nuevamente con las dos evidencias requeridas.'
WHERE EXISTS (
  SELECT 1
  FROM public.kyc_requests r
  WHERE r.user_id = p.id
    AND r.status = 'pending'
    AND r.selfie_path IS NULL
);

UPDATE public.kyc_requests
SET status = 'rejected',
    rejection_reason = 'La solicitud debe enviarse nuevamente con las dos evidencias requeridas.',
    updated_at = now()
WHERE status = 'pending' AND selfie_path IS NULL;

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
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'kyc_documents' AND name = v_document_path
    )
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'kyc_documents' AND name = v_selfie_path
    )
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

COMMIT;
