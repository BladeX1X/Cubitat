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

  property_title := COALESCE(NULLIF(pg_catalog.btrim(NEW.title), ''), 'Tu publicacion');

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
        notification_title := 'Revisión aprobada';
        notification_message := 'Tu publicación «' || property_title || '» fue aprobada.';
      WHEN 'ai_rejected' THEN
        notification_title := 'Publicacion requiere cambios';
        notification_message := COALESCE(NULLIF(pg_catalog.btrim(NEW.moderation_message), ''), 'Tu publicacion "' || property_title || '" no paso la revision automatica.');
      WHEN 'paused' THEN
        notification_title := 'Publicacion oculta';
        notification_message := COALESCE(NULLIF(pg_catalog.btrim(NEW.moderation_message), ''), 'Tu publicacion "' || property_title || '" fue ocultada por moderacion.');
      WHEN 'pending_review' THEN
        notification_title := 'Publicacion en revision';
        notification_message := COALESCE(NULLIF(pg_catalog.btrim(NEW.moderation_message), ''), 'Tu publicacion "' || property_title || '" esta pendiente de revision.');
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, action_path)
  VALUES (NEW.user_id, notification_title, notification_message, '/mis-propiedades');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_property_status_change() FROM PUBLIC;
