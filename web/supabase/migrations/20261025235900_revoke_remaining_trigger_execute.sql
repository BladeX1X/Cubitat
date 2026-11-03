-- Trigger handlers are internal implementation details. PostgreSQL checks
-- EXECUTE when a trigger is created; installed triggers do not need API grants.
REVOKE ALL ON FUNCTION public.set_search_alerts_updated_at()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reject_property_moderation_audit_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_owner_hidden_transition()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.assign_search_notification_destination()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.touch_push_subscription()
  FROM PUBLIC, anon, authenticated, service_role;
-- DEV and production have used different names for this trigger handler.
-- Revoke whichever variant exists without changing the active trigger or its
-- retention window.
DO $$
BEGIN
  IF to_regprocedure('public.schedule_kyc_evidence_purge()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.schedule_kyc_evidence_purge() FROM PUBLIC, anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.schedule_approved_kyc_evidence_purge()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.schedule_approved_kyc_evidence_purge() FROM PUBLIC, anon, authenticated, service_role';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_property_verification_audit()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_search_alert_email()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reject_property_verification_audit_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
