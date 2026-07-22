-- Migration: 20260801000000_phase2_kyc_and_agents.sql
-- Description: Añade campos de perfil de agencia/agente, verificación KYC y estado de confianza.

-- 1. Extensión de la tabla profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS agency_logo TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' NOT NULL,
  ADD COLUMN IF NOT EXISTS verification_reason TEXT;

-- Constraint para asegurar estados válidos de verificación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_verification_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_verification_status
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

-- 2. Creación de la tabla kyc_requests
CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en kyc_requests
ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS en kyc_requests
DROP POLICY IF EXISTS "Usuarios ven sus propias solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Usuarios ven sus propias solicitudes KYC" ON public.kyc_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios crean sus solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Usuarios crean sus solicitudes KYC" ON public.kyc_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins gestionan todas las solicitudes KYC" ON public.kyc_requests;
CREATE POLICY "Admins gestionan todas las solicitudes KYC" ON public.kyc_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. RPC para enviar solicitud de verificación KYC
CREATE OR REPLACE FUNCTION public.submit_kyc_request(
  p_document_type TEXT,
  p_document_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Insertar solicitud
  INSERT INTO public.kyc_requests (user_id, document_type, document_url, status)
  VALUES (v_user_id, p_document_type, p_document_url, 'pending')
  RETURNING id INTO v_request_id;

  -- Actualizar estado en perfil
  UPDATE public.profiles
  SET verification_status = 'pending', verification_reason = NULL
  WHERE id = v_user_id;

  RETURN v_request_id;
END;
$$;

-- 4. RPC para revisión administrativa de KYC
CREATE OR REPLACE FUNCTION public.review_kyc_request(
  p_request_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_target_user_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Verificar que el usuario ejecutor sea admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permiso denegado: Requiere rol administrativo';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Estado no válido';
  END IF;

  -- Obtener el user_id de la solicitud
  SELECT user_id INTO v_target_user_id
  FROM public.kyc_requests
  WHERE id = p_request_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitud KYC no encontrada';
  END IF;

  -- Actualizar solicitud
  UPDATE public.kyc_requests
  SET status = p_status, rejection_reason = p_reason, updated_at = now()
  WHERE id = p_request_id;

  -- Actualizar perfil
  UPDATE public.profiles
  SET verification_status = CASE WHEN p_status = 'approved' THEN 'verified' ELSE 'rejected' END,
      verification_reason = p_reason
  WHERE id = v_target_user_id;
END;
$$;

-- Permisos de ejecución de las RPCs
GRANT EXECUTE ON FUNCTION public.submit_kyc_request(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_kyc_request(UUID, TEXT, TEXT) TO authenticated;
