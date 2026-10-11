-- DEV ONLY. Paginated, deduplicated queue for unresolved pHash candidates.
CREATE OR REPLACE FUNCTION public.get_admin_property_image_duplicate_candidates(
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_total bigint;
  v_property_ids uuid[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Administrator AAL2 required';
  END IF;
  IF p_page IS NULL OR p_page < 0 OR p_page > 100000
    OR p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 30 THEN
    RAISE EXCEPTION 'Invalid pagination';
  END IF;

  WITH candidates AS (
    SELECT property.id, property.created_at
    FROM public.properties property
    WHERE EXISTS (
      SELECT 1
      FROM public.property_image_duplicate_flags flag
      WHERE flag.property_id = property.id
        AND flag.resolved_at IS NULL
    )
  )
  SELECT count(*) INTO v_total FROM candidates;

  WITH candidates AS (
    SELECT property.id, property.created_at
    FROM public.properties property
    WHERE EXISTS (
      SELECT 1
      FROM public.property_image_duplicate_flags flag
      WHERE flag.property_id = property.id
        AND flag.resolved_at IS NULL
    )
  )
  SELECT coalesce(array_agg(page_rows.id ORDER BY page_rows.created_at DESC, page_rows.id), ARRAY[]::uuid[])
  INTO v_property_ids
  FROM (
    SELECT id, created_at
    FROM candidates
    ORDER BY created_at DESC, id
    LIMIT p_page_size
    OFFSET (p_page::bigint * p_page_size)
  ) page_rows;

  RETURN jsonb_build_object(
    'property_ids', to_jsonb(v_property_ids),
    'total_count', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_property_image_duplicate_candidates(integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_property_image_duplicate_candidates(integer, integer)
  TO authenticated;
