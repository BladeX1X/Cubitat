-- Require approved identity verification before a profile becomes an agent.

CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.role = 'agent'::public.user_role
    AND NEW.verification_status IS DISTINCT FROM 'verified' THEN
    IF OLD.role = 'agent'::public.user_role
      AND OLD.verification_status IS DISTINCT FROM NEW.verification_status
      AND current_setting('app.kyc_internal', true) = 'true' THEN
      NEW.role := 'buyer'::public.user_role;
    ELSE
      RAISE EXCEPTION 'Debes completar y aprobar la verificacion de identidad antes de activar el perfil de agente.';
    END IF;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin_aal2()
      AND NOT (
        auth.uid() IS NOT NULL
        AND auth.uid() = OLD.id
        AND OLD.role IN ('buyer'::public.user_role, 'agent'::public.user_role)
        AND NEW.role IN ('buyer'::public.user_role, 'agent'::public.user_role)
      )
      AND NOT (
        current_setting('app.kyc_internal', true) = 'true'
        AND OLD.role = 'agent'::public.user_role
        AND NEW.role = 'buyer'::public.user_role
        AND OLD.verification_status IS DISTINCT FROM NEW.verification_status
      ) THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
    END IF;
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

