-- Immutable, minimal evidence for property moderation actions.
-- The capture trigger runs in the same transaction as the property mutation.

CREATE TABLE public.property_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  property_owner_id uuid,
  property_title text,
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  source text NOT NULL,
  provider text,
  old_status public.property_status,
  new_status public.property_status,
  old_moderation_message text,
  new_moderation_message text,
  changed_fields text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT property_moderation_audit_title_length CHECK (char_length(property_title) <= 160),
  CONSTRAINT property_moderation_audit_actor_role_length CHECK (char_length(actor_role) BETWEEN 1 AND 40),
  CONSTRAINT property_moderation_audit_action_allowed CHECK (action IN ('update', 'delete')),
  CONSTRAINT property_moderation_audit_source_allowed CHECK (source IN ('admin', 'owner', 'automation', 'system')),
  CONSTRAINT property_moderation_audit_provider_length CHECK (provider IS NULL OR char_length(provider) BETWEEN 1 AND 40),
  CONSTRAINT property_moderation_audit_changed_fields_present CHECK (cardinality(changed_fields) > 0),
  CONSTRAINT property_moderation_audit_changed_fields_allowed CHECK (
    changed_fields <@ ARRAY['status', 'moderation_message', 'deleted']::text[]
  ),
  CONSTRAINT property_moderation_audit_provider_allowed CHECK (provider IS NULL OR provider IN ('groq')),
  CONSTRAINT property_moderation_audit_message_bounds CHECK (
    char_length(old_moderation_message) <= 2000
    AND char_length(new_moderation_message) <= 2000
  )
);

CREATE INDEX idx_property_moderation_audit_property_created
  ON public.property_moderation_audit (property_id, created_at DESC);
CREATE INDEX idx_property_moderation_audit_actor_created
  ON public.property_moderation_audit (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_property_moderation_audit_new_status_created
  ON public.property_moderation_audit (new_status, created_at DESC) WHERE new_status IS NOT NULL;
CREATE INDEX idx_property_moderation_audit_created
  ON public.property_moderation_audit (created_at DESC, id DESC);

ALTER TABLE public.property_moderation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read property moderation audit"
ON public.property_moderation_audit
FOR SELECT TO authenticated USING (public.is_admin());

REVOKE ALL ON TABLE public.property_moderation_audit FROM PUBLIC;
REVOKE ALL ON TABLE public.property_moderation_audit FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.property_moderation_audit FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.property_moderation_audit FROM service_role;
GRANT SELECT ON TABLE public.property_moderation_audit TO authenticated;
GRANT SELECT ON TABLE public.property_moderation_audit TO service_role;

CREATE OR REPLACE FUNCTION public.capture_property_moderation_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  audit_source text;
  audit_provider text;
  audit_actor_role text;
  fields_changed text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.moderation_message IS NOT DISTINCT FROM NEW.moderation_message THEN
      RETURN NEW;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      fields_changed := array_append(fields_changed, 'status');
    END IF;
    IF OLD.moderation_message IS DISTINCT FROM NEW.moderation_message THEN
      fields_changed := array_append(fields_changed, 'moderation_message');
    END IF;
  ELSE
    fields_changed := ARRAY['deleted'];
  END IF;

  audit_source := nullif(current_setting('cubitat.audit_source', true), '');
  audit_provider := nullif(current_setting('cubitat.audit_provider', true), '');
  audit_actor_role := coalesce(nullif(auth.role(), ''), 'database');

  IF audit_source IS NULL THEN
    audit_source := CASE
      WHEN auth.role() = 'service_role' THEN 'system'
      WHEN public.is_admin() THEN 'admin'
      WHEN auth.uid() IS NOT NULL THEN 'owner'
      ELSE 'system'
    END;
  END IF;

  INSERT INTO public.property_moderation_audit (
    property_id, property_owner_id, property_title, actor_id, actor_role,
    action, source, provider, old_status, new_status,
    old_moderation_message, new_moderation_message, changed_fields
  ) VALUES (
    OLD.id, OLD.user_id, left(OLD.title, 160), auth.uid(), audit_actor_role,
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END,
    audit_source, audit_provider, OLD.status,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END,
    left(OLD.moderation_message, 2000),
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE left(NEW.moderation_message, 2000) END,
    fields_changed
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_property_moderation_audit() FROM PUBLIC;

CREATE TRIGGER capture_property_moderation_audit_trigger
AFTER UPDATE OF status, moderation_message OR DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.capture_property_moderation_audit();

CREATE OR REPLACE FUNCTION public.reject_property_moderation_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Moderation audit events are immutable.';
END;
$$;

REVOKE ALL ON FUNCTION public.reject_property_moderation_audit_mutation() FROM PUBLIC;

CREATE TRIGGER reject_property_moderation_audit_mutation_trigger
BEFORE UPDATE OR DELETE ON public.property_moderation_audit
FOR EACH ROW EXECUTE FUNCTION public.reject_property_moderation_audit_mutation();

CREATE OR REPLACE FUNCTION public.set_property_ai_moderation_trusted(
  p_property_id uuid,
  p_status public.property_status,
  p_message text DEFAULT NULL,
  p_provider text DEFAULT NULL
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
    'ai_rejected'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Invalid moderation status.';
  END IF;

  IF p_provider IS NOT NULL AND p_provider NOT IN ('groq') THEN
    RAISE EXCEPTION 'Invalid moderation provider.';
  END IF;

  PERFORM set_config(
    'cubitat.audit_source',
    CASE
      WHEN p_provider IS NULL THEN 'system'
      ELSE 'automation'
    END,
    true
  );
  PERFORM set_config('cubitat.audit_provider', coalesce(p_provider, ''), true);

  UPDATE public.properties
  SET status = p_status,
      moderation_message = p_message,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_property_ai_moderation_trusted(uuid, public.property_status, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_property_ai_moderation_trusted(uuid, public.property_status, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_property_ai_moderation_trusted(uuid, public.property_status, text, text) TO service_role;
