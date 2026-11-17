DO $$
BEGIN
  IF to_regclass('public.properties') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'price_usd'
    ) THEN
    RAISE EXCEPTION 'property_currency_preflight_missing_properties_baseline';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'price_currency'
  ) THEN
    RAISE EXCEPTION 'property_currency_preflight_partial_or_already_applied';
  END IF;

  IF to_regprocedure('public.get_property_value_comparables(text,text,text,numeric)') IS NULL
    OR to_regprocedure('public.notify_matching_search_alerts()') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.properties'::regclass
        AND tgname = 'notify_matching_search_alerts'
        AND NOT tgisinternal
    ) THEN
    RAISE EXCEPTION 'property_currency_preflight_function_or_trigger_baseline_mismatch';
  END IF;
END;
$$;

SELECT 'PASS: exact pre-migration schema baseline';
