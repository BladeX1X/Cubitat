-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.
-- Migration: 20260801000000_phase2_kyc_and_agents.sql
-- Description: Fase 2 segura: perfiles publicos minimos, KYC privado y cola de correo.

-- 1. Campos profesionales y de verificacion.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_name text,
  ADD COLUMN IF NOT EXISTS agency_logo text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS license_number text,
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

-- Los usuarios conservan la edicion de su perfil, pero nunca controlan su
-- verificacion. Las RPC KYC habilitan una marca local solo durante su transaccion.
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
  END IF;

  IF OLD.phone_verified_at IS DISTINCT FROM NEW.phone_verified_at
    AND NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'No tienes permisos para modificar el estado de verificacion telefonica.';
  END IF;

  IF (
    OLD.verification_status IS DISTINCT FROM NEW.verification_status
    OR OLD.verification_reason IS DISTINCT FROM NEW.verification_reason
  )
    AND current_setting('app.kyc_internal', true) IS DISTINCT FROM 'true'
    AND NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'No tienes permisos para modificar la verificacion de identidad.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Solicitudes KYC: la base guarda una ruta privada, nunca una URL publica.
CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('identity_card', 'license', 'passport')),
  document_path text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS kyc_requests_one_pending_per_user_idx
  ON public.kyc_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus propias solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Usuarios ven sus propias solicitudes KYC"
ON public.kyc_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios crean sus solicitudes KYC" ON public.kyc_requests;
DROP POLICY IF EXISTS "Admins gestionan todas las solicitudes KYC" ON public.kyc_requests;
DROP POLICY IF EXISTS "Admins gestionan solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Admins gestionan solicitudes KYC"
ON public.kyc_requests FOR ALL TO authenticated
USING (public.is_admin_aal2())
WITH CHECK (public.is_admin_aal2());

REVOKE INSERT, UPDATE, DELETE ON public.kyc_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.kyc_requests TO authenticated;

-- 3. Storage privado. El propietario controla su carpeta y admin AAL2 puede leer.
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

-- 4. RPC del propietario: valida tipo, carpeta, objeto y evita solicitudes paralelas.
CREATE OR REPLACE FUNCTION public.submit_kyc_request(
  p_document_type text,
  p_document_path text
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

  IF p_document_type NOT IN ('identity_card', 'license', 'passport') THEN
    RAISE EXCEPTION 'Tipo de documento no valido';
  END IF;

  IF p_document_path IS NULL
    OR p_document_path NOT LIKE v_user_id::text || '/%'
    OR p_document_path LIKE '%..%'
    OR length(p_document_path) > 300 THEN
    RAISE EXCEPTION 'Ruta de documento no valida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'kyc_documents' AND name = p_document_path
  ) THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.kyc_requests
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente';
  END IF;

  INSERT INTO public.kyc_requests (user_id, document_type, document_path)
  VALUES (v_user_id, p_document_type, p_document_path)
  RETURNING id INTO v_request_id;

  PERFORM set_config('app.kyc_internal', 'true', true);
  UPDATE public.profiles
  SET verification_status = 'pending', verification_reason = NULL
  WHERE id = v_user_id;

  RETURN v_request_id;
END;
$$;

-- 5. RPC administrativa: la misma frontera AAL2 que el resto de moderacion.
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

  SELECT user_id INTO v_target_user_id
  FROM public.kyc_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitud KYC no encontrada o ya procesada';
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

REVOKE ALL ON FUNCTION public.submit_kyc_request(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_kyc_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc_request(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_kyc_request(uuid, text, text) TO authenticated;

-- 6. Perfil publico minimo. No se abre la RLS privada de profiles.
CREATE OR REPLACE FUNCTION public.get_public_agent_profile(p_agent_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  agency_name text,
  agency_logo text,
  bio text,
  license_number text,
  verification_status text,
  created_at timestamptz,
  active_properties_count bigint,
  reports_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    p.id,
    COALESCE(NULLIF(btrim(p.full_name), ''), 'Anunciante Cubitat'),
    CASE WHEN p.verification_status = 'verified' THEN p.phone ELSE NULL END,
    p.agency_name,
    p.agency_logo,
    p.bio,
    CASE WHEN p.verification_status = 'verified' THEN p.license_number ELSE NULL END,
    p.verification_status,
    p.created_at,
    COUNT(DISTINCT published.id),
    COUNT(DISTINCT reports.id)
  FROM public.profiles p
  JOIN public.properties published
    ON published.user_id = p.id
   AND published.status = 'published'::public.property_status
  LEFT JOIN public.properties owned ON owned.user_id = p.id
  LEFT JOIN public.property_reports reports ON reports.property_id = owned.id
  WHERE p.id = p_agent_id
  GROUP BY p.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent_profile(UUID) TO anon, authenticated;

-- 7. Cola de correo para alertas creadas por el trigger idempotente existente.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_delivery_status text DEFAULT 'not_applicable' NOT NULL,
  ADD COLUMN IF NOT EXISTS email_attempts integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS email_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_email_delivery_status_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_email_delivery_status_check
      CHECK (email_delivery_status IN ('not_applicable', 'pending', 'processing', 'sent', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_pending_email_idx
  ON public.notifications (created_at)
  WHERE email_delivery_status = 'pending';

CREATE OR REPLACE FUNCTION public.prepare_search_alert_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.event_key LIKE 'search-alert:%' THEN
    NEW.email_delivery_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_search_alert_email ON public.notifications;
CREATE TRIGGER prepare_search_alert_email
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.prepare_search_alert_email();

REVOKE ALL ON FUNCTION public.prepare_search_alert_email() FROM PUBLIC;

-- Reclamo atomico: evita envios duplicados si dos Cron Workers se solapan y
-- recupera trabajos abandonados tras 30 minutos.
CREATE OR REPLACE FUNCTION public.claim_pending_alert_emails(p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, user_id uuid, title text, message text, email_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.notifications n
  SET email_delivery_status = 'failed'
  WHERE n.email_delivery_status = 'processing'
    AND n.email_attempts >= 3
    AND n.email_last_attempt_at < now() - interval '30 minutes';

  RETURN QUERY
  WITH candidates AS (
    SELECT n.id
    FROM public.notifications n
    WHERE (
      n.email_delivery_status = 'pending'
      OR (n.email_delivery_status = 'processing'
        AND n.email_last_attempt_at < now() - interval '30 minutes')
    )
      AND n.email_attempts < 3
    ORDER BY n.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  )
  UPDATE public.notifications n
  SET email_delivery_status = 'processing',
      email_attempts = n.email_attempts + 1,
      email_last_attempt_at = now()
  FROM candidates
  WHERE n.id = candidates.id
  RETURNING n.id, n.user_id, n.title, n.message, n.email_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_alert_emails(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_alert_emails(integer) TO service_role;
