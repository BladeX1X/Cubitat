BEGIN;

DO $$
DECLARE
  v_public_contact_exec boolean;
  v_valuation_auth_exec boolean;
  v_valuation_anon_exec boolean;
BEGIN
  IF to_regclass('public.home_service_providers') IS NULL
    OR to_regclass('public.home_service_reviews') IS NULL
    OR to_regclass('public.material_listings') IS NULL
    OR to_regclass('public.business_benefits') IS NULL THEN
    RAISE EXCEPTION 'phase4_tables_missing';
  END IF;

  IF has_column_privilege('anon', 'public.home_service_providers', 'phone', 'SELECT')
    OR has_column_privilege('anon', 'public.home_service_providers', 'whatsapp', 'SELECT')
    OR has_column_privilege('authenticated', 'public.home_service_providers', 'phone', 'SELECT')
    OR has_column_privilege('authenticated', 'public.home_service_providers', 'whatsapp', 'SELECT')
    OR has_column_privilege('anon', 'public.material_listings', 'phone', 'SELECT')
    OR has_column_privilege('anon', 'public.material_listings', 'whatsapp', 'SELECT')
    OR has_column_privilege('authenticated', 'public.material_listings', 'phone', 'SELECT')
    OR has_column_privilege('authenticated', 'public.material_listings', 'whatsapp', 'SELECT') THEN
    RAISE EXCEPTION 'phase4_contact_columns_leaked';
  END IF;

  SELECT has_function_privilege('anon', 'public.get_public_marketplace_contact(text,uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.get_public_marketplace_contact(text,uuid)', 'EXECUTE')
    INTO v_public_contact_exec;
  IF coalesce(v_public_contact_exec, true)
    OR NOT has_function_privilege('service_role', 'public.get_public_marketplace_contact(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'phase4_private_contact_rpc_grants_invalid';
  END IF;

  SELECT has_function_privilege('authenticated', 'public.get_property_value_comparables(text,text,text,numeric)', 'EXECUTE'),
    has_function_privilege('anon', 'public.get_property_value_comparables(text,text,text,numeric)', 'EXECUTE')
    INTO v_valuation_auth_exec, v_valuation_anon_exec;
  IF NOT coalesce(v_valuation_auth_exec, false) OR coalesce(v_valuation_anon_exec, true) THEN
    RAISE EXCEPTION 'phase4_valuation_rpc_grants_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'material-listings' AND public = false
  ) THEN
    RAISE EXCEPTION 'phase4_material_storage_bucket_invalid';
  END IF;
END;
$$;

ROLLBACK;
