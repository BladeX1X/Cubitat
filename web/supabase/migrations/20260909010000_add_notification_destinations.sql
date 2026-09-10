ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS action_path text;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_action_path_internal;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_action_path_internal CHECK (
  action_path IS NULL
  OR (
    pg_catalog.length(action_path) <= 500
    AND pg_catalog.left(action_path, 1) = '/'
    AND pg_catalog.left(action_path, 2) <> '//'
  )
);

CREATE OR REPLACE FUNCTION public.assign_search_notification_destination()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.action_path IS NULL
    AND NEW.event_key ~ '^search-alert:[0-9a-f-]+:property:[0-9a-f-]+$' THEN
    NEW.action_path := '/propiedad/' || pg_catalog.split_part(NEW.event_key, ':', 4);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_search_notification_destination ON public.notifications;

CREATE TRIGGER assign_search_notification_destination
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.assign_search_notification_destination();

REVOKE ALL ON FUNCTION public.assign_search_notification_destination() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_new_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_owner_id uuid;
  v_property_title text;
BEGIN
  SELECT user_id, title
  INTO v_owner_id, v_property_title
  FROM public.properties
  WHERE id = NEW.property_id;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, action_path)
    VALUES (
      v_owner_id,
      'Interés en tu propiedad',
      NEW.contact_name || ' te ha enviado un mensaje por "' || v_property_title || '". Tel: ' || NEW.contact_phone,
      '/propiedad/' || NEW.property_id::text || '#contactar-anunciante'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_contact() FROM PUBLIC;

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
        notification_title := 'Revision automatica aprobada';
        notification_message := 'La IA aprobo "' || property_title || '". Un moderador puede publicarla pronto.';
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

COMMENT ON COLUMN public.notifications.action_path IS
  'Optional same-origin path opened when the user selects the notification.';
