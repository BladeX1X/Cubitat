DO $$
DECLARE
  currency_column information_schema.columns%ROWTYPE;
  constraint_definition text;
  valuation_function text;
  alert_function text;
  valuation_index text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261116140000'
  ) THEN
    RAISE EXCEPTION 'property_currency_postcheck_missing_ledger_version';
  END IF;

  SELECT * INTO currency_column
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'price_currency';
  IF NOT FOUND OR currency_column.is_nullable <> 'NO' OR currency_column.column_default NOT LIKE '%USD%' THEN
    RAISE EXCEPTION 'property_currency_postcheck_column_contract_mismatch';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.properties'::regclass AND conname = 'properties_price_currency_check';
  IF constraint_definition IS NULL
    OR constraint_definition NOT LIKE '%USD%'
    OR constraint_definition NOT LIKE '%CUP%'
    OR constraint_definition NOT LIKE '%MLC%' THEN
    RAISE EXCEPTION 'property_currency_postcheck_constraint_mismatch';
  END IF;

  SELECT indexdef INTO valuation_index FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'properties_public_valuation_idx';
  IF valuation_index IS NULL OR valuation_index NOT LIKE '%price_currency%' OR valuation_index NOT LIKE '%USD%' THEN
    RAISE EXCEPTION 'property_currency_postcheck_index_mismatch';
  END IF;

  SELECT pg_get_functiondef('public.get_property_value_comparables(text,text,text,numeric)'::regprocedure)
    INTO valuation_function;
  SELECT pg_get_functiondef('public.notify_matching_search_alerts()'::regprocedure)
    INTO alert_function;
  IF valuation_function NOT LIKE '%price_currency%' OR valuation_function NOT LIKE '%USD%'
    OR alert_function NOT LIKE '%price_currency%' OR alert_function NOT LIKE '%USD%' THEN
    RAISE EXCEPTION 'property_currency_postcheck_function_mismatch';
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.properties'::regclass
        AND tgname = 'notify_matching_search_alerts'
        AND NOT tgisinternal
        AND tgenabled <> 'D'
    ) THEN
    RAISE EXCEPTION 'property_currency_postcheck_alert_trigger_missing';
  END IF;

  IF NOT has_column_privilege('anon', 'public.properties', 'price_currency', 'SELECT')
    OR NOT has_column_privilege('authenticated', 'public.properties', 'price_currency', 'SELECT')
    OR NOT has_column_privilege('authenticated', 'public.properties', 'price_currency', 'INSERT')
    OR NOT has_column_privilege('authenticated', 'public.properties', 'price_currency', 'UPDATE')
    OR NOT has_column_privilege('service_role', 'public.properties', 'price_currency', 'SELECT')
    OR has_column_privilege('anon', 'public.properties', 'price_currency', 'INSERT')
    OR has_column_privilege('anon', 'public.properties', 'price_currency', 'UPDATE')
    OR has_function_privilege('anon', 'public.get_property_value_comparables(text,text,text,numeric)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.get_property_value_comparables(text,text,text,numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'property_currency_postcheck_privilege_mismatch';
  END IF;

  IF EXISTS (SELECT 1 FROM public.properties WHERE price_currency NOT IN ('USD', 'CUP', 'MLC')) THEN
    RAISE EXCEPTION 'property_currency_postcheck_invalid_existing_value';
  END IF;
END;
$$;

SELECT 'PASS: property currency schema and security contracts';
