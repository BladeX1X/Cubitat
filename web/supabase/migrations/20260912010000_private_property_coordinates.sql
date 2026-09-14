-- Preserve exact owner coordinates privately and expose only an approximate grid.
BEGIN;

CREATE TABLE public.property_private_coordinates (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  coordinates jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_private_coordinates_object
    CHECK (jsonb_typeof(coordinates) = 'object')
);

ALTER TABLE public.property_private_coordinates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.property_private_coordinates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_private_coordinates TO authenticated;
GRANT ALL ON public.property_private_coordinates TO service_role;

CREATE POLICY "Owners read their private property coordinates"
ON public.property_private_coordinates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = property_id
      AND property.user_id = (SELECT auth.uid())
  )
);

CREATE FUNCTION public.normalize_property_coordinates_json(raw_coordinates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  latitude numeric;
  longitude numeric;
BEGIN
  IF raw_coordinates IS NULL OR jsonb_typeof(raw_coordinates) <> 'object' THEN
    RETURN NULL;
  END IF;

  latitude := coalesce(raw_coordinates ->> 'latitude', raw_coordinates ->> 'lat')::numeric;
  longitude := coalesce(raw_coordinates ->> 'longitude', raw_coordinates ->> 'lng')::numeric;

  IF latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180 THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('latitude', latitude, 'longitude', longitude);
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_property_coordinates_json(jsonb) FROM PUBLIC;

CREATE FUNCTION public.approximate_property_coordinates(raw_coordinates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  normalized jsonb := public.normalize_property_coordinates_json(raw_coordinates);
  latitude numeric;
  longitude numeric;
  grid numeric := 0.02;
BEGIN
  IF normalized IS NULL THEN
    RETURN NULL;
  END IF;

  latitude := (normalized ->> 'latitude')::numeric;
  longitude := (normalized ->> 'longitude')::numeric;

  RETURN jsonb_build_object(
    'latitude', round(latitude / grid) * grid,
    'longitude', round(longitude / grid) * grid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approximate_property_coordinates(jsonb) FROM PUBLIC;

INSERT INTO public.property_private_coordinates (property_id, coordinates)
SELECT id, public.normalize_property_coordinates_json(coordinates)
FROM public.properties
WHERE public.normalize_property_coordinates_json(coordinates) IS NOT NULL;

UPDATE public.properties
SET coordinates = public.approximate_property_coordinates(coordinates)
WHERE coordinates IS NOT NULL;

CREATE FUNCTION public.protect_property_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  exact_coordinates jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.coordinates IS NOT DISTINCT FROM OLD.coordinates THEN
    RETURN NEW;
  END IF;

  exact_coordinates := public.normalize_property_coordinates_json(NEW.coordinates);

  IF exact_coordinates IS NULL THEN
    IF TG_OP = 'UPDATE' THEN
      DELETE FROM public.property_private_coordinates
      WHERE property_id = NEW.id;
    END IF;

    NEW.coordinates := NULL;
    RETURN NEW;
  END IF;

  INSERT INTO public.property_private_coordinates (property_id, coordinates)
  VALUES (NEW.id, exact_coordinates)
  ON CONFLICT (property_id) DO UPDATE
  SET coordinates = EXCLUDED.coordinates,
      updated_at = now();

  NEW.coordinates := public.approximate_property_coordinates(exact_coordinates);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_property_coordinates() FROM PUBLIC;

CREATE TRIGGER protect_property_coordinates
BEFORE INSERT OR UPDATE OF coordinates ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.protect_property_coordinates();

COMMENT ON TABLE public.property_private_coordinates IS
  'Owner-only exact coordinates. Public properties.coordinates uses a 0.02 degree privacy grid.';

COMMIT;
