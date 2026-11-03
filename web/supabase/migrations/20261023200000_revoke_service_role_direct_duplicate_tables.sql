-- Duplicate signals are read or changed through SECURITY DEFINER functions.
-- No Worker or client requires direct service_role access to these rows.
BEGIN;
REVOKE ALL ON TABLE public.property_duplicate_flags FROM service_role;
COMMIT;
