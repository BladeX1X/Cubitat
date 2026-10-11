BEGIN;

-- Add the approved-seller badge and document-verification audit required by the Phase 2 production UI.
-- Publicly expose only IDs needed to label published listings whose
-- non-agent owner has completed identity verification.
CREATE OR REPLACE FUNCTION public.get_verified_seller_ids()
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT profiles.id
  FROM public.profiles
  WHERE profiles.role IN ('buyer'::public.user_role, 'seller'::public.user_role)
    AND profiles.verification_status = 'verified'
    AND EXISTS (
      SELECT 1
      FROM public.properties
      WHERE properties.user_id = profiles.id
        AND properties.status = 'published'::public.property_status
    );
$$;

REVOKE ALL ON FUNCTION public.get_verified_seller_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verified_seller_ids() TO anon, authenticated;

-- Immutable timeline entries for property document verification.
-- Deliberately excludes storage paths and user-submitted notes.

CREATE TABLE IF NOT EXISTS public.property_verification_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  property_id uuid NOT NULL,
  property_owner_id uuid,
  property_title text,
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL CHECK (action IN ('document_submitted', 'document_approved', 'document_rejected')),
  old_status text,
  new_status text NOT NULL,
  reason text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT ARRAY['document_verification']::text[],
  created_at timestamptz NOT NULL,
  CONSTRAINT property_verification_audit_request_action_unique UNIQUE (request_id, action),
  CONSTRAINT property_verification_audit_title_length CHECK (property_title IS NULL OR char_length(property_title) <= 160),
  CONSTRAINT property_verification_audit_reason_length CHECK (char_length(reason) <= 2000)
);

CREATE INDEX IF NOT EXISTS property_verification_audit_created_idx
  ON public.property_verification_audit (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS property_verification_audit_property_idx
  ON public.property_verification_audit (property_id, created_at DESC);

ALTER TABLE public.property_verification_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins AAL2 read property verification audit" ON public.property_verification_audit;
CREATE POLICY "Admins AAL2 read property verification audit"
  ON public.property_verification_audit FOR SELECT TO authenticated
  USING (public.is_admin_aal2());

REVOKE ALL ON TABLE public.property_verification_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.property_verification_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_property_verification_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_title text;
BEGIN
  SELECT p.title INTO v_title
  FROM public.properties AS p
  WHERE p.id = NEW.property_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_verification_audit (
      request_id, property_id, property_owner_id, property_title,
      actor_id, actor_role, action, old_status, new_status,
      reason, changed_fields, created_at
    ) VALUES (
      NEW.id, NEW.property_id, NEW.owner_id, left(v_title, 160),
      NEW.owner_id, 'owner', 'document_submitted', NULL, NEW.status,
      'Evidencia documental enviada para revisión administrativa.',
      ARRAY['document_verification']::text[], NEW.created_at
    )
    ON CONFLICT (request_id, action) DO NOTHING;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.property_verification_audit (
      request_id, property_id, property_owner_id, property_title,
      actor_id, actor_role, action, old_status, new_status,
      reason, changed_fields, created_at
    ) VALUES (
      NEW.id, NEW.property_id, NEW.owner_id, left(v_title, 160),
      NEW.reviewed_by, 'administrator',
      CASE NEW.status
        WHEN 'approved' THEN 'document_approved'
        ELSE 'document_rejected'
      END,
      OLD.status, NEW.status,
      CASE NEW.status
        WHEN 'approved' THEN 'Documento aprobado en revisión administrativa.'
        ELSE left(coalesce(NEW.rejection_reason, 'Documento rechazado en revisión administrativa.'), 2000)
      END,
      ARRAY['document_verification_status']::text[],
      coalesce(NEW.reviewed_at, timezone('utc'::text, now()))
    )
    ON CONFLICT (request_id, action) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_property_verification_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS capture_property_verification_audit_trigger
  ON public.property_verification_requests;
CREATE TRIGGER capture_property_verification_audit_trigger
  AFTER INSERT OR UPDATE OF status ON public.property_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.capture_property_verification_audit();

CREATE OR REPLACE FUNCTION public.reject_property_verification_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Property verification audit events are immutable.';
END;
$$;

REVOKE ALL ON FUNCTION public.reject_property_verification_audit_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reject_property_verification_audit_mutation_trigger
  ON public.property_verification_audit;
CREATE TRIGGER reject_property_verification_audit_mutation_trigger
  BEFORE UPDATE OR DELETE ON public.property_verification_audit
  FOR EACH ROW EXECUTE FUNCTION public.reject_property_verification_audit_mutation();

-- Backfill the lifecycle of requests that predate this audit timeline.
INSERT INTO public.property_verification_audit (
  request_id, property_id, property_owner_id, property_title,
  actor_id, actor_role, action, old_status, new_status,
  reason, changed_fields, created_at
)
SELECT
  request.id, request.property_id, request.owner_id, left(property.title, 160),
  request.owner_id, 'owner', 'document_submitted', NULL, 'pending',
  'Evidencia documental enviada para revisión administrativa.',
  ARRAY['document_verification']::text[], request.created_at
FROM public.property_verification_requests AS request
LEFT JOIN public.properties AS property ON property.id = request.property_id
ON CONFLICT (request_id, action) DO NOTHING;

INSERT INTO public.property_verification_audit (
  request_id, property_id, property_owner_id, property_title,
  actor_id, actor_role, action, old_status, new_status,
  reason, changed_fields, created_at
)
SELECT
  request.id, request.property_id, request.owner_id, left(property.title, 160),
  request.reviewed_by, 'administrator',
  CASE request.status
    WHEN 'approved' THEN 'document_approved'
    ELSE 'document_rejected'
  END,
  'pending', request.status,
  CASE request.status
    WHEN 'approved' THEN 'Documento aprobado en revisión administrativa.'
    ELSE left(coalesce(request.rejection_reason, 'Documento rechazado en revisión administrativa.'), 2000)
  END,
  ARRAY['document_verification_status']::text[],
  coalesce(request.reviewed_at, request.updated_at)
FROM public.property_verification_requests AS request
LEFT JOIN public.properties AS property ON property.id = request.property_id
WHERE request.status IN ('approved', 'rejected')
  AND request.reviewed_at IS NOT NULL
ON CONFLICT (request_id, action) DO NOTHING;

CREATE OR REPLACE VIEW public.admin_moderation_audit_log
WITH (security_invoker = true)
AS
SELECT
  audit.id::text AS id,
  audit.property_id,
  audit.property_owner_id,
  audit.property_title,
  audit.actor_id,
  audit.actor_role,
  audit.action,
  audit.source,
  audit.provider,
  audit.old_status::text AS old_status,
  audit.new_status::text AS new_status,
  audit.old_moderation_message,
  audit.new_moderation_message,
  audit.changed_fields,
  audit.created_at
FROM public.property_moderation_audit AS audit
UNION ALL
SELECT
  audit.id::text AS id,
  audit.property_id,
  audit.property_owner_id,
  audit.property_title,
  audit.actor_id,
  audit.actor_role,
  audit.action,
  CASE WHEN audit.actor_role = 'owner' THEN 'owner' ELSE 'admin' END AS source,
  NULL::text AS provider,
  audit.old_status,
  audit.new_status,
  NULL::text AS old_moderation_message,
  audit.reason AS new_moderation_message,
  audit.changed_fields,
  audit.created_at
FROM public.property_verification_audit AS audit;

REVOKE ALL ON public.admin_moderation_audit_log FROM PUBLIC, anon;
GRANT SELECT ON public.admin_moderation_audit_log TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

