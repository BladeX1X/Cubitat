-- Mantiene bloqueados los cambios de rol desde clientes regulares.
-- La activacion de agentes pertenece a Fase 2 DEV y exige KYC aprobado.

CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin_aal2() THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
    END IF;
  END IF;

  IF OLD.phone_verified_at IS DISTINCT FROM NEW.phone_verified_at
    AND NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'No tienes permisos para modificar el estado de verificacion telefonica.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;
