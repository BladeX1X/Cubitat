-- Reversible visibility controls with actor-specific ownership boundaries.

DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;

CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN (
    'draft'::public.property_status,
    'pending_review'::public.property_status,
    'paused'::public.property_status,
    'owner_hidden'::public.property_status
  )
);

CREATE OR REPLACE FUNCTION public.guard_owner_hidden_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'owner_hidden'::public.property_status THEN
    IF OLD.status <> 'published'::public.property_status
      OR auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Only the property owner can change owner-hidden visibility.';
    END IF;
  ELSIF OLD.status = 'owner_hidden'::public.property_status THEN
    IF NEW.status NOT IN (
      'published'::public.property_status,
      'pending_review'::public.property_status
    ) OR auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Only the property owner can change owner-hidden visibility.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_owner_hidden_transition() FROM PUBLIC;

DROP TRIGGER IF EXISTS guard_owner_hidden_transition_trigger ON public.properties;

CREATE TRIGGER guard_owner_hidden_transition_trigger
BEFORE UPDATE OF status ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.guard_owner_hidden_transition();

CREATE OR REPLACE FUNCTION public.hide_own_property(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.properties
  SET status = 'owner_hidden'::public.property_status,
      moderation_message = NULL,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id
    AND user_id = auth.uid()
    AND status = 'published'::public.property_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Published property not found or not owned by caller.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_own_property(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.properties
  SET status = 'published'::public.property_status,
      moderation_message = NULL,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id
    AND user_id = auth.uid()
    AND status = 'owner_hidden'::public.property_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Owner-hidden property not found or not owned by caller.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_own_property(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_own_property(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_own_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_own_property(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_property_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  notification_title text;
  notification_message text;
  property_title text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  property_title := COALESCE(NULLIF(trim(NEW.title), ''), 'Tu publicacion');

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending_review'::public.property_status THEN
      RETURN NEW;
    END IF;
    notification_title := 'Publicacion recibida';
    notification_message := 'Recibimos "' || property_title || '" y ya esta en revision.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    CASE NEW.status::text
      WHEN 'published' THEN
        IF OLD.status = 'owner_hidden'::public.property_status THEN
          notification_title := 'Publicacion visible';
          notification_message := 'Volviste a publicar "' || property_title || '" en Cubitat.';
        ELSE
          notification_title := 'Publicacion aprobada';
          notification_message := 'Tu publicacion "' || property_title || '" ya esta visible en Cubitat.';
        END IF;
      WHEN 'ai_approved' THEN
        notification_title := 'Revision automatica aprobada';
        notification_message := 'La IA aprobo "' || property_title || '". Un moderador puede publicarla pronto.';
      WHEN 'ai_rejected' THEN
        notification_title := 'Publicacion requiere cambios';
        notification_message := COALESCE(NULLIF(trim(NEW.moderation_message), ''), 'Tu publicacion "' || property_title || '" no paso la revision automatica.');
      WHEN 'paused' THEN
        notification_title := 'Publicacion oculta';
        notification_message := COALESCE(NULLIF(trim(NEW.moderation_message), ''), 'Tu publicacion "' || property_title || '" fue ocultada por moderacion.');
      WHEN 'pending_review' THEN
        notification_title := 'Publicacion en revision';
        notification_message := COALESCE(NULLIF(trim(NEW.moderation_message), ''), 'Tu publicacion "' || property_title || '" esta pendiente de revision.');
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (NEW.user_id, notification_title, notification_message);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_property_status_change() FROM PUBLIC;
