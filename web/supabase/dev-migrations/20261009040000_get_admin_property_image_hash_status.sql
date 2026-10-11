-- DEV ONLY. Exposes hash/index coverage only to an authenticated admin at AAL2.
CREATE OR REPLACE FUNCTION public.get_admin_property_image_hash_status(p_property_ids uuid[])
RETURNS TABLE (
  property_id uuid,
  indexed_at timestamptz,
  processed_images smallint,
  eligible_with_images bigint,
  indexed_with_hashes bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Administrator AAL2 required';
  END IF;
  IF p_property_ids IS NULL OR cardinality(p_property_ids) > 30 THEN
    RAISE EXCEPTION 'Invalid property id list';
  END IF;

  RETURN QUERY
  WITH requested AS (
    SELECT DISTINCT requested_ids.id
    FROM unnest(p_property_ids) AS requested_ids(id)
  ), eligible AS (
    SELECT candidate.id
    FROM public.properties candidate
    WHERE candidate.status::text IN ('published', 'pending_review', 'ai_approved')
      AND (
        NULLIF(pg_catalog.btrim(candidate.cover_image), '') IS NOT NULL
        OR COALESCE(pg_catalog.cardinality(candidate.images), 0) > 0
      )
  ), coverage AS (
    SELECT
      (SELECT pg_catalog.count(*) FROM eligible)::bigint AS eligible_with_images,
      (
        SELECT pg_catalog.count(*)
        FROM eligible
        JOIN public.property_image_hash_status hash_status
          ON hash_status.property_id = eligible.id
        WHERE hash_status.processed_images > 0
      )::bigint AS indexed_with_hashes
  )
  SELECT requested.id, hash_status.indexed_at, hash_status.processed_images,
    coverage.eligible_with_images, coverage.indexed_with_hashes
  FROM requested
  LEFT JOIN public.property_image_hash_status hash_status
    ON hash_status.property_id = requested.id
  CROSS JOIN coverage;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_property_image_hash_status(uuid[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_property_image_hash_status(uuid[])
  TO authenticated;
