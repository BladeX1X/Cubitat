-- Función del disparador para notificar al propietario sobre un nuevo contacto
CREATE OR REPLACE FUNCTION public.handle_new_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_property_title TEXT;
BEGIN
  -- Obtener el owner_id y el título de la propiedad relacionada
  SELECT user_id, title INTO v_owner_id, v_property_title
  FROM public.properties
  WHERE id = NEW.property_id;

  -- Si la propiedad tiene un dueño asignado, insertar la notificación
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      v_owner_id,
      'Interés en tu propiedad',
      NEW.contact_name || ' te ha enviado un mensaje por "' || v_property_title || '". Tel: ' || NEW.contact_phone
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger sobre la tabla contacts
CREATE OR REPLACE TRIGGER on_new_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_contact();
