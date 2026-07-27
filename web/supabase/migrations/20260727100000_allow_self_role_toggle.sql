-- Migration: Permite a los usuarios alternar su propio perfil entre Anunciante Particular (buyer) y Agente (agent),
-- manteniendo el bloqueo estricto contra la elevación no autorizada al rol de Administrador ('admin').

CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- 1. Prevenir estrictamente que un usuario regular se asigne el rol de 'admin'
    IF NEW.role = 'admin'::public.user_role AND NOT public.is_admin_aal2() THEN
      RAISE EXCEPTION 'No tienes permisos para asignar el rol de administrador.';
    END IF;

    -- 2. Asegurar que solo el propio dueño del perfil o un admin puedan modificar el rol entre buyer/agent
    IF NOT public.is_admin_aal2() AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM OLD.id) THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
    END IF;
  END IF;

  IF OLD.phone_verified_at IS DISTINCT FROM NEW.phone_verified_at AND NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'No tienes permisos para modificar el estado de verificacion telefonica.';
  END IF;

  IF (OLD.verification_status IS DISTINCT FROM NEW.verification_status OR OLD.verification_reason IS DISTINCT FROM NEW.verification_reason)
    AND current_setting('app.kyc_internal', true) IS DISTINCT FROM 'true'
    AND NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'No tienes permisos para modificar la verificacion de identidad.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Asegurar que la tabla profiles tenga política INSERT para el propio usuario en caso de filas nuevas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow individual insert of own profile'
  ) THEN
    CREATE POLICY "Allow individual insert of own profile" 
      ON public.profiles FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
