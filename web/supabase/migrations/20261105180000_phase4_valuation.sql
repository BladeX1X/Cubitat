-- F4-VAL exposes only published, minimal comparables to authenticated users.
CREATE INDEX IF NOT EXISTS properties_public_valuation_idx
  ON public.properties (property_type, operation, area_m2, created_at DESC)
  WHERE status = 'published' AND price_usd > 0 AND area_m2 > 0;

CREATE OR REPLACE FUNCTION public.get_property_value_comparables(
  p_property_type text,
  p_operation text,
  p_location text,
  p_area_m2 numeric
)
RETURNS TABLE (
  comparable_id uuid,
  area_m2 numeric,
  price_usd numeric,
  published_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_count integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR p_property_type IS NULL OR p_property_type NOT IN ('casa', 'apartamento', 'terreno')
    OR p_operation IS NULL OR p_operation NOT IN ('venta', 'alquiler')
    OR char_length(btrim(coalesce(p_location, ''))) NOT BETWEEN 2 AND 120
    OR p_area_m2 IS NULL OR p_area_m2 NOT BETWEEN 10 AND 10000 THEN
    RAISE EXCEPTION 'invalid_valuation_request' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.properties AS property
  WHERE property.status = 'published'
    AND property.property_type::text = p_property_type
    AND property.operation::text = p_operation
    AND property.price_usd > 0
    AND property.area_m2 BETWEEN p_area_m2 * 0.70 AND p_area_m2 * 1.30
    AND property.location ILIKE '%' || btrim(p_location) || '%';

  IF v_count < 5 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT property.id, property.area_m2, property.price_usd, property.created_at
  FROM public.properties AS property
  WHERE property.status = 'published'
    AND property.property_type::text = p_property_type
    AND property.operation::text = p_operation
    AND property.price_usd > 0
    AND property.area_m2 BETWEEN p_area_m2 * 0.70 AND p_area_m2 * 1.30
    AND property.location ILIKE '%' || btrim(p_location) || '%'
  ORDER BY abs(property.area_m2 - p_area_m2), property.created_at DESC
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_property_value_comparables(text, text, text, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_value_comparables(text, text, text, numeric)
  TO authenticated;
