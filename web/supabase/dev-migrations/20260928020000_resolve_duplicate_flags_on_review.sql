-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.
-- Fase 2: cerrar automáticamente una señal de duplicado después de revisión.

BEGIN;

CREATE OR REPLACE FUNCTION public.persist_property_duplicate_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_duplicate_id uuid;
  v_fingerprint text;
  v_resolved_at timestamptz;
BEGIN
  DELETE FROM public.property_duplicate_flags
  WHERE property_id = NEW.id;

  SELECT duplicate_id, fingerprint INTO v_duplicate_id, v_fingerprint
  FROM public.find_property_duplicate(
    NEW.id,
    NEW.title,
    NEW.location,
    NEW.operation,
    NEW.property_type,
    NEW.price_usd,
    NEW.area_m2
  );

  IF v_duplicate_id IS NOT NULL THEN
    v_resolved_at := CASE
      WHEN NEW.status::text IN ('published', 'ai_rejected', 'paused', 'owner_hidden')
        THEN timezone('utc'::text, now())
      ELSE NULL
    END;

    INSERT INTO public.property_duplicate_flags (
      property_id,
      duplicate_of,
      fingerprint,
      resolved_at
    )
    VALUES (NEW.id, v_duplicate_id, v_fingerprint, v_resolved_at)
    ON CONFLICT (property_id) DO UPDATE
      SET duplicate_of = EXCLUDED.duplicate_of,
          fingerprint = EXCLUDED.fingerprint,
          resolved_at = EXCLUDED.resolved_at,
          resolved_by = NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
