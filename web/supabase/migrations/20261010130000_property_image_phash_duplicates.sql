BEGIN;

-- Perceptual image duplicate signals for admin review; never auto-reject or auto-publish.
CREATE TABLE IF NOT EXISTS public.property_image_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  image_index smallint NOT NULL CHECK (image_index BETWEEN 0 AND 19),
  perceptual_hash text NOT NULL CHECK (perceptual_hash ~ '^[01]{64}$'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT property_image_fingerprints_property_image_unique UNIQUE (property_id, image_index)
);

CREATE INDEX IF NOT EXISTS property_image_fingerprints_hash_idx
  ON public.property_image_fingerprints (perceptual_hash);

CREATE TABLE IF NOT EXISTS public.property_image_hash_status (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  indexed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_images smallint NOT NULL DEFAULT 0 CHECK (processed_images BETWEEN 0 AND 20)
);

CREATE TABLE IF NOT EXISTS public.property_image_duplicate_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  duplicate_of uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  hamming_distance smallint NOT NULL CHECK (hamming_distance BETWEEN 0 AND 64),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  CONSTRAINT property_image_duplicate_flags_distinct_properties CHECK (property_id <> duplicate_of),
  CONSTRAINT property_image_duplicate_flags_unique_pair UNIQUE (property_id, duplicate_of)
);

CREATE INDEX IF NOT EXISTS property_image_duplicate_flags_duplicate_of_idx
  ON public.property_image_duplicate_flags (duplicate_of);
CREATE INDEX IF NOT EXISTS property_image_duplicate_flags_unresolved_idx
  ON public.property_image_duplicate_flags (property_id)
  WHERE resolved_at IS NULL;

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
    )
  ORDER BY property.created_at ASC, property.id ASC
  LIMIT least(greatest(p_limit, 0), 2);
$$;

REVOKE ALL ON FUNCTION public.get_unindexed_property_images(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unindexed_property_images(uuid, integer)
  TO service_role;

ALTER TABLE public.property_image_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_image_duplicate_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_image_hash_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins AAL2 read property image fingerprints"
  ON public.property_image_fingerprints;
CREATE POLICY "Admins AAL2 read property image fingerprints"
ON public.property_image_fingerprints FOR SELECT TO authenticated
USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "Admins AAL2 read property image duplicate flags"
  ON public.property_image_duplicate_flags;
CREATE POLICY "Admins AAL2 read property image duplicate flags"
ON public.property_image_duplicate_flags FOR SELECT TO authenticated
USING (public.is_admin_aal2());

REVOKE ALL ON public.property_image_fingerprints FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.property_image_duplicate_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_image_fingerprints TO authenticated;
GRANT SELECT ON public.property_image_duplicate_flags TO authenticated;
GRANT ALL ON public.property_image_fingerprints TO service_role;
GRANT ALL ON public.property_image_duplicate_flags TO service_role;
REVOKE ALL ON public.property_image_hash_status FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.property_image_hash_status TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_property_image_duplicate_signals(
  p_property_id uuid,
  p_hashes text[],
  p_max_distance integer DEFAULT 8
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_hashes IS NULL OR cardinality(p_hashes) > 20 OR p_max_distance IS NULL OR p_max_distance < 0 OR p_max_distance > 16 THEN
    RAISE EXCEPTION 'Invalid image duplicate input';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_hashes) AS inputs(hash) WHERE hash !~ '^[01]{64}$') THEN
    RAISE EXCEPTION 'Invalid perceptual hash';
  END IF;

  DELETE FROM public.property_image_fingerprints WHERE property_id = p_property_id;
  DELETE FROM public.property_image_duplicate_flags WHERE property_id = p_property_id;
  INSERT INTO public.property_image_hash_status (property_id, indexed_at, processed_images)
  VALUES (p_property_id, timezone('utc'::text, now()), cardinality(p_hashes)::smallint)
  ON CONFLICT (property_id) DO UPDATE
    SET indexed_at = EXCLUDED.indexed_at,
        processed_images = EXCLUDED.processed_images;

  INSERT INTO public.property_image_fingerprints (property_id, image_index, perceptual_hash)
  SELECT p_property_id, (entry.ordinality - 1)::smallint, entry.hash
  FROM unnest(p_hashes) WITH ORDINALITY AS entry(hash, ordinality);

  WITH uploaded AS (
    SELECT hash::bit(64) AS hash FROM unnest(p_hashes) AS inputs(hash)
  ), matches AS (
    SELECT existing.property_id AS duplicate_id,
      min(length(replace((existing.perceptual_hash::bit(64) # uploaded.hash)::text, '0', '')))::smallint AS distance
    FROM uploaded
    JOIN public.property_image_fingerprints existing
      ON existing.property_id <> p_property_id
    JOIN public.properties candidate ON candidate.id = existing.property_id
    WHERE candidate.status::text IN ('published', 'pending_review', 'ai_approved')
    GROUP BY existing.property_id
  )
  INSERT INTO public.property_image_duplicate_flags (property_id, duplicate_of, hamming_distance, resolved_at)
  SELECT p_property_id, matches.duplicate_id, matches.distance,
    CASE
      WHEN (SELECT property.status::text FROM public.properties property WHERE property.id = p_property_id)
        IN ('published', 'ai_rejected', 'paused', 'owner_hidden')
        THEN timezone('utc'::text, now())
      ELSE NULL
    END
  FROM matches
  WHERE matches.distance <= p_max_distance
  ORDER BY matches.distance ASC, matches.duplicate_id ASC
  LIMIT 10;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_property_image_duplicate_signals(uuid, text[], integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_property_image_duplicate_signals(uuid, text[], integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_unresolved_property_image_duplicates(
  p_indexed_property_id uuid,
  p_max_distance integer DEFAULT 8
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_max_distance IS NULL OR p_max_distance < 0 OR p_max_distance > 16 THEN
    RAISE EXCEPTION 'Invalid perceptual distance';
  END IF;

  WITH indexed_images AS (
    SELECT perceptual_hash::bit(64) AS hash
    FROM public.property_image_fingerprints
    WHERE property_id = p_indexed_property_id
  ), pending_matches AS (
    SELECT pending.id AS property_id,
      min(length(replace((pending_hash.perceptual_hash::bit(64) # indexed_images.hash)::text, '0', '')))::smallint AS distance
    FROM indexed_images
    JOIN public.property_image_fingerprints pending_hash ON TRUE
    JOIN public.properties pending ON pending.id = pending_hash.property_id
    WHERE pending.id <> p_indexed_property_id
      AND pending.status::text IN ('pending_review', 'ai_approved')
    GROUP BY pending.id
  )
  INSERT INTO public.property_image_duplicate_flags (property_id, duplicate_of, hamming_distance)
  SELECT pending_matches.property_id, p_indexed_property_id, pending_matches.distance
  FROM pending_matches
  WHERE pending_matches.distance <= p_max_distance
  ON CONFLICT (property_id, duplicate_of) DO UPDATE
    SET hamming_distance = EXCLUDED.hamming_distance,
        resolved_at = NULL,
        resolved_by = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_unresolved_property_image_duplicates(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_unresolved_property_image_duplicates(uuid, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_property_image_duplicate_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status::text IN ('published', 'ai_rejected', 'paused', 'owner_hidden') THEN
    UPDATE public.property_image_duplicate_flags
    SET resolved_at = timezone('utc'::text, now())
    WHERE property_id = NEW.id AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_image_duplicate_flags_resolve_after_review ON public.properties;
CREATE TRIGGER property_image_duplicate_flags_resolve_after_review
AFTER UPDATE OF status ON public.properties
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.resolve_property_image_duplicate_flags();
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

COMMIT;

