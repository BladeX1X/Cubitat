-- F4-BIZ owns manual commercial benefit grants. No payments are processed.
-- Requires the platform helper public.is_admin_aal2(). Targets are opaque UUIDs:
-- this module intentionally has no FK/dependency on F4-SVC or F4-MAT tables.
-- Rollback: disable consumers first and retain grants/audit for history; do not
-- drop these tables automatically or cascade-delete commercial records.

CREATE TABLE public.business_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('account', 'service_profile', 'material_listing')),
  target_id uuid NOT NULL,
  benefit_code text NOT NULL CHECK (benefit_code IN (
    'listing_featured', 'profile_featured', 'priority_contact', 'commercial_badge'
  )),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  grant_reason text NOT NULL CHECK (length(btrim(grant_reason)) BETWEEN 5 AND 500),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_benefits_validity CHECK (expires_at > starts_at),
  CONSTRAINT business_benefits_revocation_pair CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL
      AND length(btrim(coalesce(revocation_reason, ''))) BETWEEN 5 AND 500)
  )
);

CREATE INDEX business_benefits_active_target_idx
  ON public.business_benefits (target_type, target_id, starts_at, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE public.business_benefit_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.business_benefits(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('granted', 'revoked')),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 5 AND 500),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_benefit_audit_benefit_idx
  ON public.business_benefit_audit (benefit_id, occurred_at DESC);

ALTER TABLE public.business_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_benefit_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_benefits, public.business_benefit_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_active_business_benefits(
  p_target_type text,
  p_target_id uuid,
  p_at timestamptz DEFAULT now()
)
RETURNS TABLE (benefit_code text, starts_at timestamptz, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT benefit.benefit_code, benefit.starts_at, benefit.expires_at
  FROM public.business_benefits AS benefit
  WHERE p_target_type IN ('account', 'service_profile', 'material_listing')
    AND benefit.target_type = p_target_type
    AND benefit.target_id = p_target_id
    AND (p_target_type <> 'account' OR (SELECT auth.uid()) = p_target_id)
    AND benefit.revoked_at IS NULL
    AND benefit.starts_at <= coalesce(p_at, now())
    AND benefit.expires_at > coalesce(p_at, now())
  ORDER BY benefit.benefit_code, benefit.expires_at;
$$;
REVOKE ALL ON FUNCTION public.get_active_business_benefits(text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_business_benefits(text, uuid, timestamptz) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_business_benefits()
RETURNS TABLE (
  id uuid, target_type text, target_id uuid, benefit_code text,
  starts_at timestamptz, expires_at timestamptz, granted_by uuid,
  grant_reason text, revoked_at timestamptz, revoked_by uuid,
  revocation_reason text, created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT benefit.id, benefit.target_type, benefit.target_id, benefit.benefit_code,
    benefit.starts_at, benefit.expires_at, benefit.granted_by, benefit.grant_reason,
    benefit.revoked_at, benefit.revoked_by, benefit.revocation_reason, benefit.created_at
  FROM public.business_benefits AS benefit
  ORDER BY benefit.created_at DESC
  LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_business_benefits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_business_benefits() TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_business_benefit(
  p_target_type text,
  p_target_id uuid,
  p_benefit_code text,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF p_target_type IS NULL OR p_target_type NOT IN ('account', 'service_profile', 'material_listing')
    OR p_target_id IS NULL
    OR p_benefit_code IS NULL OR p_benefit_code NOT IN ('listing_featured', 'profile_featured', 'priority_contact', 'commercial_badge')
    OR p_starts_at IS NULL OR p_expires_at IS NULL
    OR p_expires_at <= p_starts_at OR p_expires_at <= now()
    OR length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'invalid_business_benefit' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.business_benefits (
    target_type, target_id, benefit_code, starts_at, expires_at, granted_by, grant_reason
  ) VALUES (
    p_target_type, p_target_id, p_benefit_code, p_starts_at, p_expires_at, v_actor, btrim(p_reason)
  ) RETURNING id INTO v_id;
  INSERT INTO public.business_benefit_audit (benefit_id, action, actor_id, reason)
  VALUES (v_id, 'granted', v_actor, btrim(p_reason));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_business_benefit(text, uuid, text, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_business_benefit(text, uuid, text, timestamptz, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_business_benefit(p_benefit_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF length(v_reason) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'invalid_business_benefit_reason' USING ERRCODE = '22023';
  END IF;
  UPDATE public.business_benefits AS benefit
  SET revoked_at = now(), revoked_by = v_actor, revocation_reason = v_reason
  WHERE benefit.id = p_benefit_id AND benefit.revoked_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.business_benefit_audit (benefit_id, action, actor_id, reason)
  VALUES (p_benefit_id, 'revoked', v_actor, v_reason);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_business_benefit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_business_benefit(uuid, text) TO authenticated;
