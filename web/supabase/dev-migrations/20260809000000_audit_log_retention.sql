-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT
-- Auth audit retention preview and guarded batch purge.
-- Applying this migration creates capabilities only; it never deletes rows.

CREATE TABLE public.auth_audit_retention_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason_code text NOT NULL,
  review_after date NOT NULL,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_audit_retention_holds_window_valid
    CHECK (ends_at > starts_at),
  CONSTRAINT auth_audit_retention_holds_reason_closed
    CHECK (reason_code IN ('security_incident', 'legal_hold', 'regulatory_review')),
  CONSTRAINT auth_audit_retention_holds_review_valid
    CHECK (review_after >= created_at::date),
  CONSTRAINT auth_audit_retention_holds_release_valid
    CHECK (released_at IS NULL OR released_at >= created_at)
);

CREATE INDEX auth_audit_retention_holds_active_window_idx
  ON public.auth_audit_retention_holds (starts_at, ends_at)
  WHERE released_at IS NULL;

ALTER TABLE public.auth_audit_retention_holds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_audit_retention_holds
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.auth_audit_retention_holds
  TO service_role;

CREATE OR REPLACE FUNCTION public.preview_auth_audit_retention()
RETURNS TABLE (
  cutoff_at timestamptz,
  eligible_count bigint,
  oldest_eligible_at timestamptz,
  newest_eligible_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH parameters AS (
    SELECT statement_timestamp() - interval '90 days' AS cutoff_at
  )
  SELECT
    parameters.cutoff_at,
    count(a.id)::bigint AS eligible_count,
    min(a.created_at) AS oldest_eligible_at,
    max(a.created_at) AS newest_eligible_at
  FROM parameters
  LEFT JOIN auth.audit_log_entries AS a
    ON a.created_at < parameters.cutoff_at
   AND NOT EXISTS (
     SELECT 1
     FROM public.auth_audit_retention_holds AS hold
     WHERE hold.released_at IS NULL
       AND a.created_at >= hold.starts_at
       AND a.created_at < hold.ends_at
   )
  GROUP BY parameters.cutoff_at;
$$;

CREATE OR REPLACE FUNCTION public.purge_auth_audit_log_entries(
  p_batch_size integer DEFAULT 500,
  p_dry_run boolean DEFAULT true
)
RETURNS TABLE (
  cutoff_at timestamptz,
  eligible_count bigint,
  deleted_count bigint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_cutoff_at timestamptz := statement_timestamp() - interval '90 days';
  v_eligible_count bigint;
  v_deleted_count bigint := 0;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 1000 THEN
    RAISE EXCEPTION 'Audit retention batch size must be between 1 and 1000.'
      USING ERRCODE = '22023';
  END IF;

  IF p_dry_run IS NULL THEN
    RAISE EXCEPTION 'Audit retention dry-run flag is required.'
      USING ERRCODE = '22004';
  END IF;

  SELECT count(a.id)::bigint
  INTO v_eligible_count
  FROM auth.audit_log_entries AS a
  WHERE a.created_at < v_cutoff_at
    AND NOT EXISTS (
      SELECT 1
      FROM public.auth_audit_retention_holds AS hold
      WHERE hold.released_at IS NULL
        AND a.created_at >= hold.starts_at
        AND a.created_at < hold.ends_at
    );

  IF NOT p_dry_run THEN
    WITH candidates AS (
      SELECT a.id
      FROM auth.audit_log_entries AS a
      WHERE a.created_at < v_cutoff_at
        AND NOT EXISTS (
          SELECT 1
          FROM public.auth_audit_retention_holds AS hold
          WHERE hold.released_at IS NULL
            AND a.created_at >= hold.starts_at
            AND a.created_at < hold.ends_at
        )
      ORDER BY a.created_at, a.id
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM auth.audit_log_entries AS audit_entry
    USING candidates
    WHERE audit_entry.id = candidates.id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;

  RETURN QUERY
  SELECT v_cutoff_at, v_eligible_count, v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_auth_audit_retention()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_auth_audit_log_entries(integer, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.preview_auth_audit_retention()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_auth_audit_log_entries(integer, boolean)
  TO service_role;

COMMENT ON TABLE public.auth_audit_retention_holds IS
  'Time ranges excluded from Auth audit retention while an investigation or legal review is active.';
COMMENT ON FUNCTION public.preview_auth_audit_retention() IS
  'Returns aggregate eligibility for the fixed 90-day Auth audit retention policy without row contents.';
COMMENT ON FUNCTION public.purge_auth_audit_log_entries(integer, boolean) IS
  'Server-only bounded Auth audit retention function. Defaults to dry-run and has no automatic invocation.';
