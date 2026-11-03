-- Reconciled DEV candidate (2026-11-01, America/Mexico_City).
-- Supersedes the colliding local version 20261025110000; do not repair or apply the old ID.
-- Remote baseline confirmed read-only: claim table/RPCs absent; decision RPC has the legacy six-argument signature.

-- Reconcile the already-present DEV audit contract and make clean replays self-contained.
ALTER TABLE public.home_service_moderation_audit
  DROP CONSTRAINT IF EXISTS home_service_moderation_audit_action_check,
  DROP CONSTRAINT IF EXISTS home_service_moderation_audit_check,
  ALTER COLUMN actor_id DROP NOT NULL,
  ADD CONSTRAINT home_service_moderation_audit_action_check
    CHECK (action IN ('approve', 'reject', 'pause', 'ai_approve', 'ai_reject')),
  ADD CONSTRAINT home_service_moderation_audit_check
    CHECK (action IN ('approve', 'ai_approve') OR char_length(btrim(reason)) BETWEEN 5 AND 500);

ALTER TABLE public.material_moderation_audit
  DROP CONSTRAINT IF EXISTS material_moderation_audit_action_check,
  DROP CONSTRAINT IF EXISTS material_moderation_audit_check,
  ALTER COLUMN actor_id DROP NOT NULL,
  ADD CONSTRAINT material_moderation_audit_action_check
    CHECK (action IN ('approve', 'reject', 'pause', 'ai_approve', 'ai_reject')),
  ADD CONSTRAINT material_moderation_audit_check
    CHECK (action IN ('approve', 'ai_approve') OR char_length(btrim(reason)) BETWEEN 5 AND 500);

-- One AI review per SVC/MAT listing version, even for concurrent requests.
-- This migration is DEV-only because the F4 auto-moderation route is DEV-only.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE private.phase4_listing_ai_moderation_claims (
  kind text NOT NULL CHECK (kind IN ('service', 'material')),
  listing_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  expected_updated_at timestamptz NOT NULL,
  claim_token uuid NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (kind, listing_id)
);

ALTER TABLE private.phase4_listing_ai_moderation_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.phase4_listing_ai_moderation_claims
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_phase4_listing_ai_moderation(
  p_kind text,
  p_listing_id uuid,
  p_owner_id uuid,
  p_expected_updated_at timestamptz,
  p_claim_token uuid,
  p_lease_seconds integer DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_owner_id uuid;
  v_updated_at timestamptz;
  v_status text;
  v_claimed boolean := false;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('service', 'material') OR p_listing_id IS NULL
    OR p_owner_id IS NULL OR p_expected_updated_at IS NULL OR p_claim_token IS NULL
    OR p_lease_seconds NOT BETWEEN 30 AND 300 THEN
    RAISE EXCEPTION 'invalid_moderation_claim' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'phase4-listing-ai:' || p_kind || ':' || p_listing_id::text, 0
  ));

  IF p_kind = 'service' THEN
    SELECT owner_id, updated_at, status INTO v_owner_id, v_updated_at, v_status
    FROM public.home_service_providers WHERE id = p_listing_id FOR UPDATE;
  ELSE
    SELECT owner_id, updated_at, status INTO v_owner_id, v_updated_at, v_status
    FROM public.material_listings WHERE id = p_listing_id FOR UPDATE;
  END IF;

  IF NOT FOUND OR v_owner_id IS DISTINCT FROM p_owner_id
    OR v_updated_at IS DISTINCT FROM p_expected_updated_at
    OR v_status IS DISTINCT FROM 'pending_review' THEN
    RETURN false;
  END IF;

  INSERT INTO private.phase4_listing_ai_moderation_claims AS existing (
    kind, listing_id, owner_id, expected_updated_at, claim_token, lease_expires_at
  ) VALUES (
    p_kind, p_listing_id, p_owner_id, p_expected_updated_at, p_claim_token,
    clock_timestamp() + make_interval(secs => p_lease_seconds)
  )
  ON CONFLICT (kind, listing_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    expected_updated_at = EXCLUDED.expected_updated_at,
    claim_token = EXCLUDED.claim_token,
    lease_expires_at = EXCLUDED.lease_expires_at,
    claimed_at = clock_timestamp()
  WHERE existing.lease_expires_at <= clock_timestamp()
    OR existing.expected_updated_at IS DISTINCT FROM EXCLUDED.expected_updated_at
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_phase4_listing_ai_moderation(
  p_kind text,
  p_listing_id uuid,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('service', 'material') OR p_listing_id IS NULL OR p_claim_token IS NULL THEN
    RAISE EXCEPTION 'invalid_moderation_claim' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'phase4-listing-ai:' || p_kind || ':' || p_listing_id::text, 0
  ));
  DELETE FROM private.phase4_listing_ai_moderation_claims
  WHERE kind = p_kind AND listing_id = p_listing_id AND claim_token = p_claim_token;
  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.apply_phase4_listing_ai_decision(text, uuid, uuid, timestamptz, text, text);

CREATE FUNCTION public.apply_phase4_listing_ai_decision(
  p_kind text,
  p_listing_id uuid,
  p_owner_id uuid,
  p_expected_updated_at timestamptz,
  p_decision text,
  p_reason text,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('service', 'material') OR p_listing_id IS NULL OR p_owner_id IS NULL
    OR p_expected_updated_at IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approve', 'reject')
    OR char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 500
    OR p_claim_token IS NULL THEN
    RAISE EXCEPTION 'invalid_ai_moderation_decision' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'phase4-listing-ai:' || p_kind || ':' || p_listing_id::text, 0
  ));

  PERFORM 1 FROM private.phase4_listing_ai_moderation_claims
  WHERE kind = p_kind AND listing_id = p_listing_id AND owner_id = p_owner_id
    AND expected_updated_at = p_expected_updated_at AND claim_token = p_claim_token
    AND lease_expires_at > clock_timestamp()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF p_kind = 'service' THEN
    UPDATE public.home_service_providers
      SET status = CASE p_decision WHEN 'approve' THEN 'published' ELSE 'rejected' END,
          updated_at = now()
      WHERE id = p_listing_id AND owner_id = p_owner_id
        AND status = 'pending_review' AND updated_at = p_expected_updated_at;
    IF NOT FOUND THEN RETURN false; END IF;
    INSERT INTO public.home_service_moderation_audit
      (provider_id, action, reason, actor_id)
    VALUES (p_listing_id, CASE p_decision WHEN 'approve' THEN 'ai_approve' ELSE 'ai_reject' END,
      btrim(p_reason), NULL);
  ELSE
    UPDATE public.material_listings
      SET status = CASE p_decision WHEN 'approve' THEN 'published' ELSE 'rejected' END,
          updated_at = now()
      WHERE id = p_listing_id AND owner_id = p_owner_id
        AND status = 'pending_review' AND updated_at = p_expected_updated_at;
    IF NOT FOUND THEN RETURN false; END IF;
    INSERT INTO public.material_moderation_audit
      (listing_id, action, reason, actor_id)
    VALUES (p_listing_id, CASE p_decision WHEN 'approve' THEN 'ai_approve' ELSE 'ai_reject' END,
      btrim(p_reason), NULL);
  END IF;

  DELETE FROM private.phase4_listing_ai_moderation_claims
  WHERE kind = p_kind AND listing_id = p_listing_id AND claim_token = p_claim_token;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_phase4_listing_ai_moderation(text, uuid, uuid, timestamptz, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_phase4_listing_ai_moderation(text, uuid, uuid, timestamptz, uuid, integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.release_phase4_listing_ai_moderation(text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_phase4_listing_ai_moderation(text, uuid, uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.apply_phase4_listing_ai_decision(text, uuid, uuid, timestamptz, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_phase4_listing_ai_decision(text, uuid, uuid, timestamptz, text, text, uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
