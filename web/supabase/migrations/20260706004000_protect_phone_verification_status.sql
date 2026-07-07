-- Actualizar la función check_profile_role_update() para proteger también phone_verified_at
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger AS $$
BEGIN
  -- Impedir la modificación de la columna role a no-administradores
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::public.user_role
    ) THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
    END IF;
  END IF;

  -- Impedir la modificación de la columna phone_verified_at desde peticiones REST directas del cliente
  IF OLD.phone_verified_at IS DISTINCT FROM NEW.phone_verified_at THEN
    IF current_setting('role', true) IN ('authenticated', 'anon') THEN
      -- Permitir si es un administrador verificado
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'::public.user_role
      ) THEN
        RAISE EXCEPTION 'No tienes permisos para modificar el estado de verificación telefónica.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
