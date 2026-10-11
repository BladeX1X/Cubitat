-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.
-- Retry rows that were indexed before the Worker accepted proxied image URLs.

CREATE OR REPLACE FUNCTION public.get_unindexed_property_images(
  p_exclude_property_id uuid,
  p_limit integer DEFAULT 2
)
RETURNS TABLE (id uuid, user_id uuid, status text, cover_image text, images text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT property.id, property.user_id, property.status::text,
    property.cover_image, property.images
  FROM public.properties property
  WHERE (p_exclude_property_id IS NULL OR property.id <> p_exclude_property_id)
    AND property.status::text IN ('published', 'pending_review', 'ai_approved')
    AND NOT EXISTS (
      SELECT 1 FROM public.property_image_hash_status hash_status
      WHERE hash_status.property_id = property.id
        AND (
          hash_status.processed_images > 0
          OR hash_status.indexed_at > timezone('utc'::text, now()) - interval '15 minutes'
        )
    )
  ORDER BY property.created_at ASC, property.id ASC
  LIMIT least(greatest(p_limit, 0), 2);
$$;

REVOKE ALL ON FUNCTION public.get_unindexed_property_images(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unindexed_property_images(uuid, integer)
  TO service_role;
