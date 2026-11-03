-- Fase 3 DEV: hacer cumplir en PostgreSQL la pausa de referidos y comisiones.
-- Ocultar UI/Worker no debe dejar las RPC de mutación accesibles por Data API.

REVOKE ALL ON FUNCTION public.ensure_agent_referral_link()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_agent_commission(uuid, text, numeric, numeric, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_agent_commission_status(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_agent_referral_visit(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_agent_referral_visit_count()
  FROM PUBLIC, anon, authenticated, service_role;
