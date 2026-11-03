-- Duplicate-detection functions schema-qualify application objects; keep
-- SECURITY DEFINER name resolution limited to PostgreSQL's trusted catalog.

ALTER FUNCTION public.find_property_duplicate(
  uuid,
  text,
  text,
  public.operation_type,
  public.property_type,
  numeric,
  numeric
)
  SET search_path = pg_catalog;
ALTER FUNCTION public.apply_property_duplicate_signal()
  SET search_path = pg_catalog;
ALTER FUNCTION public.persist_property_duplicate_flag()
  SET search_path = pg_catalog;
