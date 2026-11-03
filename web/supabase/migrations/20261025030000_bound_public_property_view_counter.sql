-- Fase 1: mantener el contador público dentro de lo observable y evitar overflow.
CREATE OR REPLACE FUNCTION public.increment_property_view_count(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = property_id
    AND status = 'published'::public.property_status
    AND view_count < 2147483647;
END;
$$;

COMMENT ON FUNCTION public.increment_property_view_count(uuid) IS
  'Increments views only for published properties and stops at the integer maximum.';
