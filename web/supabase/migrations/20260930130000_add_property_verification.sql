-- Private property evidence and internal trust indicator for production.

CREATE TABLE IF NOT EXISTS public.property_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('ownership_title', 'purchase_contract', 'other')),
  document_path text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id), reviewed_at timestamptz, rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_property_verification_idx
  ON public.property_verification_requests (property_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS property_verification_owner_idx
  ON public.property_verification_requests (owner_id, created_at DESC);
ALTER TABLE public.property_verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property owners read own verification requests" ON public.property_verification_requests;
CREATE POLICY "Property owners read own verification requests" ON public.property_verification_requests
  FOR SELECT TO authenticated USING (auth.uid() = owner_id OR public.is_admin_aal2());
DROP POLICY IF EXISTS "Admins manage property verification requests" ON public.property_verification_requests;
CREATE POLICY "Admins manage property verification requests" ON public.property_verification_requests
  FOR SELECT TO authenticated USING (public.is_admin_aal2());
REVOKE INSERT, UPDATE, DELETE ON public.property_verification_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_verification_requests TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property_documents', 'property_documents', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Property owners upload own evidence" ON storage.objects;
CREATE POLICY "Property owners upload own evidence" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property_documents' AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^property-[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id::text = substring((storage.foldername(name))[2] FROM 10) AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "Property owners read own evidence" ON storage.objects;
CREATE POLICY "Property owners read own evidence" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'property_documents' AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^property-[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id::text = substring((storage.foldername(name))[2] FROM 10) AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "Property owners delete own evidence" ON storage.objects;
CREATE POLICY "Property owners delete own evidence" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property_documents' AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^property-[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id::text = substring((storage.foldername(name))[2] FROM 10) AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "Property verification admin reads evidence" ON storage.objects;
CREATE POLICY "Property verification admin reads evidence" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'property_documents' AND public.is_admin_aal2());

CREATE OR REPLACE FUNCTION public.submit_property_verification(p_property_id uuid, p_document_type text, p_document_path text, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_user_id uuid := auth.uid(); v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
  IF p_document_type NOT IN ('ownership_title', 'purchase_contract', 'other') THEN RAISE EXCEPTION 'Tipo de documento no valido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'La propiedad no pertenece al usuario'; END IF;
  IF p_document_path IS NULL OR p_document_path NOT LIKE v_user_id::text || '/property-' || p_property_id::text || '/%' OR p_document_path LIKE '%..%' OR length(p_document_path) > 300 THEN RAISE EXCEPTION 'Ruta de documento no valida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'property_documents' AND name = p_document_path) THEN RAISE EXCEPTION 'Documento de propiedad no encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.property_verification_requests WHERE property_id = p_property_id AND status = 'pending') THEN RAISE EXCEPTION 'Ya existe una solicitud pendiente para esta propiedad'; END IF;
  INSERT INTO public.property_verification_requests (property_id, owner_id, document_type, document_path, notes)
  VALUES (p_property_id, v_user_id, p_document_type, p_document_path, NULLIF(btrim(p_notes), '')) RETURNING id INTO v_request_id;
  RETURN v_request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.review_property_verification(p_request_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN RAISE EXCEPTION 'Permiso denegado: se requiere administrador AAL2'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Estado de revision no valido'; END IF;
  IF p_status = 'rejected' AND NULLIF(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'El rechazo requiere un motivo'; END IF;
  UPDATE public.property_verification_requests SET status = p_status, reviewed_by = auth.uid(), reviewed_at = timezone('utc'::text, now()), rejection_reason = CASE WHEN p_status = 'rejected' THEN btrim(p_reason) ELSE NULL END, updated_at = now() WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud de propiedad no encontrada o ya procesada'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_property_trust_score(p_property_id uuid)
RETURNS TABLE (score integer, identity_verified boolean, document_verified boolean, published boolean, contact_present boolean, internal_indicator text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_owner_id uuid;
BEGIN
  SELECT p.user_id INTO v_owner_id FROM public.properties p WHERE p.id = p_property_id;
  IF v_owner_id IS NULL OR (auth.uid() IS DISTINCT FROM v_owner_id AND NOT public.is_admin_aal2()) THEN RAISE EXCEPTION 'Permiso denegado'; END IF;
  RETURN QUERY WITH factors AS (
    SELECT (profile.verification_status = 'verified') AS identity_verified,
      EXISTS (SELECT 1 FROM public.property_verification_requests r WHERE r.property_id = property.id AND r.status = 'approved') AS document_verified,
      (property.status = 'published'::public.property_status) AS published,
      (property.contact_info IS NOT NULL AND property.contact_info <> '{}'::jsonb) AS contact_present
    FROM public.properties property JOIN public.profiles profile ON profile.id = property.user_id WHERE property.id = p_property_id)
  SELECT (CASE WHEN factors.identity_verified THEN 30 ELSE 0 END + CASE WHEN factors.document_verified THEN 40 ELSE 0 END + CASE WHEN factors.published THEN 20 ELSE 0 END + CASE WHEN factors.contact_present THEN 10 ELSE 0 END)::integer, factors.identity_verified, factors.document_verified, factors.published, factors.contact_present, 'internal_indicator_not_legal_certification'::text FROM factors;
END; $$;

REVOKE ALL ON FUNCTION public.submit_property_verification(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_property_verification(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_property_trust_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_property_verification(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_property_verification(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_trust_score(uuid) TO authenticated;
