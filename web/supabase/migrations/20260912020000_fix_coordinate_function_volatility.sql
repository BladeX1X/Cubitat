-- JSON coordinate normalization uses catalog routines classified as stable.
BEGIN;

ALTER FUNCTION public.normalize_property_coordinates_json(jsonb) STABLE;
ALTER FUNCTION public.approximate_property_coordinates(jsonb) STABLE;

COMMIT;
