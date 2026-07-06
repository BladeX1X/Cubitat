-- 1. Asegurar que la función handle_new_user() degrade cualquier rol admin enviado en metadatos públicos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role public.user_role;
BEGIN
  assigned_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'buyer'::public.user_role);
  
  -- Si intentan registrarse como admin mediante metadatos, degradar a buyer
  IF assigned_role = 'admin'::public.user_role THEN
    assigned_role := 'buyer'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    assigned_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Crear función protectora para impedir la actualización de la columna role
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger AS $$
BEGIN
  -- Si el rol está cambiando, validar que el usuario que ejecuta la acción sea un administrador verificado
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::public.user_role
    ) THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el rol de usuario.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asociar el trigger BEFORE UPDATE en la tabla profiles
DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;

CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_update();
