-- ==============================================================================
-- Security hardening: profiles, roles, moderation, storage
-- ==============================================================================

-- 1. Force handle_new_user() to always assign 'buyer', ignore user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'buyer'::public.user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Add SET search_path to check_profile_role_update() to prevent injection
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Restrict profiles public read to authenticated users only
DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;

CREATE POLICY "Allow authenticated read for profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Restrict set_property_ai_moderation(): owners can only set pending_review,
--    only admins can set ai_approved or ai_rejected
CREATE OR REPLACE FUNCTION public.set_property_ai_moderation(
  p_property_id uuid,
  p_status public.property_status,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  IF p_status NOT IN (
    'pending_review'::public.property_status,
    'ai_approved'::public.property_status,
    'ai_rejected'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Invalid moderation status.';
  END IF;

  -- Owners can only set pending_review; ai_approved/ai_rejected require admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF p_status IN ('ai_approved'::public.property_status, 'ai_rejected'::public.property_status) THEN
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can set AI moderation statuses.';
    END IF;
  END IF;

  UPDATE public.properties
  SET
    status = p_status,
    moderation_message = p_message,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::public.user_role
    )
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found or not allowed.';
  END IF;
END;
$$;

-- 5. Add admin role to user_role enum (needed for earlier checks)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';