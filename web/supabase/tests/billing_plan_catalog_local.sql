-- Run only on an isolated Supabase scratch database after migrations.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(11);

SELECT is((SELECT count(*)::integer FROM public.get_active_billing_plans()), 4, 'all four approved plans are active');
SELECT is((SELECT price_cup FROM public.get_active_billing_plans() WHERE plan_code = 'natural_quarterly'), 200::bigint, 'natural quarterly price is 200 CUP');
SELECT is((SELECT price_cup FROM public.get_active_billing_plans() WHERE plan_code = 'natural_annual'), 500::bigint, 'natural annual price is 500 CUP');
SELECT is((SELECT price_cup FROM public.get_active_billing_plans() WHERE plan_code = 'legal_quarterly'), 10000::bigint, 'legal quarterly price is 10000 CUP');
SELECT is((SELECT price_cup FROM public.get_active_billing_plans() WHERE plan_code = 'legal_annual'), 30000::bigint, 'legal annual price is 30000 CUP');
SELECT ok(NOT has_table_privilege('anon', 'public.billing_plan_versions', 'INSERT,UPDATE,DELETE'), 'anon cannot mutate plan versions');
SELECT ok(NOT has_table_privilege('authenticated', 'public.billing_plan_versions', 'INSERT,UPDATE,DELETE'), 'authenticated cannot mutate plan versions');
SELECT ok(NOT has_table_privilege('service_role', 'public.billing_plan_versions', 'INSERT,UPDATE,DELETE'), 'service role cannot mutate plan versions');
SELECT ok(has_function_privilege('anon', 'public.get_active_billing_plans()', 'EXECUTE'), 'anon can read public plan catalog');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.billing_plan_versions'::regclass AND tgname = 'billing_plan_versions_immutable' AND NOT tgisinternal), 'versions are protected from updates and deletes');
SELECT ok(to_regclass('public.billing_accounts') IS NULL AND to_regclass('public.subscriptions') IS NULL AND to_regclass('public.payment_transactions') IS NULL, 'catalog migration creates no billing accounts or payments');

SELECT * FROM finish();
ROLLBACK;
