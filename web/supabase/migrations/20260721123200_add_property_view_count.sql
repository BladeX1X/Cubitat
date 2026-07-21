-- 1. Añadir columna view_count a la tabla properties
ALTER TABLE public.properties ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Crear función RPC increment_property_view_count segura
CREATE OR REPLACE FUNCTION public.increment_property_view_count(property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = property_id;
END;
$$;

-- 3. Otorgar permisos a anon y authenticated
GRANT EXECUTE ON FUNCTION public.increment_property_view_count(UUID) TO anon, authenticated;
