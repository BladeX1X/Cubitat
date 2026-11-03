-- Claim each pending property version before paying for external AI moderation.
CREATE TABLE public.property_ai_moderation_claims (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  property_updated_at timestamptz NOT NULL,
  claim_token uuid NOT NULL UNIQUE,
  lease_expires_at timestamptz NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_ai_moderation_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.property_ai_moderation_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.property_ai_moderation_claims TO service_role;

CREATE OR REPLACE FUNCTION public.claim_property_ai_moderation(
  p_property_id uuid,
  p_expected_updated_at timestamptz,
  p_claim_token uuid,
  p_lease_seconds integer DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_property_updated_at timestamptz;
  v_property_status public.property_status;
  v_claimed boolean := false;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.';
  END IF;
  IF p_property_id IS NULL OR p_expected_updated_at IS NULL OR p_claim_token IS NULL
    OR p_lease_seconds NOT BETWEEN 10 AND 300 THEN
    RAISE EXCEPTION 'Invalid moderation claim.' USING ERRCODE = '22023';
  END IF;

  SELECT property.updated_at, property.status
    INTO v_property_updated_at, v_property_status
  FROM public.properties AS property
  WHERE property.id = p_property_id;

  IF NOT FOUND
    OR v_property_status IS DISTINCT FROM 'pending_review'::public.property_status
    OR v_property_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN false;
  END IF;

  INSERT INTO public.property_ai_moderation_claims AS current_claim (
    property_id, property_updated_at, claim_token, lease_expires_at, claimed_at
  ) VALUES (
    p_property_id, p_expected_updated_at, p_claim_token,
    now() + make_interval(secs => p_lease_seconds), now()
  )
  ON CONFLICT (property_id) DO UPDATE
    SET property_updated_at = EXCLUDED.property_updated_at,
        claim_token = EXCLUDED.claim_token,
        lease_expires_at = EXCLUDED.lease_expires_at,
        claimed_at = EXCLUDED.claimed_at
    WHERE current_claim.lease_expires_at <= now()
      OR current_claim.property_updated_at IS DISTINCT FROM EXCLUDED.property_updated_at
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_property_ai_moderation_claim(
  p_property_id uuid,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_released boolean := false;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.';
  END IF;

  DELETE FROM public.property_ai_moderation_claims
  WHERE property_id = p_property_id AND claim_token = p_claim_token
  RETURNING true INTO v_released;

  RETURN coalesce(v_released, false);
END;
$$;

DROP FUNCTION IF EXISTS public.set_property_ai_moderation_trusted(
  uuid, public.property_status, text, text
);

CREATE FUNCTION public.set_property_ai_moderation_trusted(
  p_property_id uuid,
  p_status public.property_status,
  p_message text,
  p_provider text,
  p_expected_updated_at timestamptz,
  p_claim_token uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.';
  END IF;
  IF p_status NOT IN (
    'pending_review'::public.property_status,
    'ai_approved'::public.property_status,
    'ai_rejected'::public.property_status,
    'published'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Invalid moderation status.' USING ERRCODE = '22023';
  END IF;
  IF p_provider IS NOT NULL AND p_provider NOT IN ('groq') THEN
    RAISE EXCEPTION 'Invalid moderation provider.' USING ERRCODE = '22023';
  END IF;
  IF p_expected_updated_at IS NULL OR p_claim_token IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.property_ai_moderation_claims AS claim
    WHERE claim.property_id = p_property_id
      AND claim.property_updated_at = p_expected_updated_at
      AND claim.claim_token = p_claim_token
      AND claim.lease_expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Moderation claim expired or is no longer owned.' USING ERRCODE = '40001';
  END IF;

  PERFORM set_config(
    'cubitat.audit_source',
    CASE WHEN p_provider IS NULL THEN 'system' ELSE 'automation' END,
    true
  );
  PERFORM set_config('cubitat.audit_provider', coalesce(p_provider, ''), true);

  UPDATE public.properties
  SET status = p_status,
      moderation_message = p_message,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id
    AND status = 'pending_review'::public.property_status
    AND updated_at = p_expected_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property changed or is no longer pending moderation.' USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.property_ai_moderation_claims
  WHERE property_id = p_property_id AND claim_token = p_claim_token;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_property_ai_moderation(uuid, timestamptz, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_property_ai_moderation_claim(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_property_ai_moderation_trusted(uuid, public.property_status, text, text, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_property_ai_moderation(uuid, timestamptz, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_property_ai_moderation_claim(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_property_ai_moderation_trusted(uuid, public.property_status, text, text, timestamptz, uuid) TO service_role;

COMMENT ON TABLE public.property_ai_moderation_claims IS
  'Private, expiring idempotency claims preventing duplicate AI moderation for the same property version.';
