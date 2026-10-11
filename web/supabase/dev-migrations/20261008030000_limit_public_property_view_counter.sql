-- DEV ONLY: the public view-counter RPC must not mutate hidden or draft rows.
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
    AND status = 'published'::public.property_status;
END;
$$;

COMMENT ON FUNCTION public.increment_property_view_count(uuid) IS
  'Increments the public view count only for published properties.';
