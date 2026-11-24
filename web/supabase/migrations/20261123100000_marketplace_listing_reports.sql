BEGIN;

CREATE TABLE public.marketplace_listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type text NOT NULL CHECK (listing_type IN ('service', 'material')),
  listing_id uuid NOT NULL,
  listing_title text NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 2 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX marketplace_listing_reports_created_idx ON public.marketplace_listing_reports(created_at DESC);
CREATE INDEX marketplace_listing_reports_status_created_idx ON public.marketplace_listing_reports(status, created_at DESC);
ALTER TABLE public.marketplace_listing_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_listing_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.marketplace_listing_reports TO authenticated;
CREATE POLICY marketplace_listing_reports_admin_read ON public.marketplace_listing_reports
  FOR SELECT TO authenticated USING (public.is_admin_aal2());

CREATE OR REPLACE FUNCTION public.submit_marketplace_listing_report_trusted(
  p_listing_type text, p_listing_id uuid, p_reporter_id uuid, p_reason text, p_description text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE v_title text;
BEGIN
  IF p_listing_type = 'service' THEN
    SELECT display_name INTO v_title FROM public.home_service_providers WHERE id = p_listing_id AND status = 'published';
  ELSIF p_listing_type = 'material' THEN
    SELECT title INTO v_title FROM public.material_listings WHERE id = p_listing_id AND status = 'published' AND availability <> 'out_of_stock';
  ELSE
    RAISE EXCEPTION 'invalid_marketplace_listing_type' USING ERRCODE = '22023';
  END IF;
  IF v_title IS NULL THEN RAISE EXCEPTION 'listing_not_reportable' USING ERRCODE = '22023'; END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 2 AND 80 OR char_length(coalesce(p_description, '')) > 2000 THEN
    RAISE EXCEPTION 'invalid_report_content' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.marketplace_listing_reports(listing_type, listing_id, listing_title, reporter_id, reason, description)
    VALUES (p_listing_type, p_listing_id, v_title, p_reporter_id, btrim(p_reason), nullif(btrim(p_description), ''));
END;
$$;
REVOKE ALL ON FUNCTION public.submit_marketplace_listing_report_trusted(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_marketplace_listing_report_trusted(text, uuid, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.review_marketplace_listing_report(p_report_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('resolved', 'dismissed') THEN RAISE EXCEPTION 'invalid_report_status' USING ERRCODE = '22023'; END IF;
  UPDATE public.marketplace_listing_reports SET status = p_status, reviewed_at = now(), reviewer_id = (SELECT auth.uid())
    WHERE id = p_report_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'marketplace_report_not_reviewable' USING ERRCODE = '22023'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_marketplace_listing_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_marketplace_listing_report(uuid, text) TO authenticated;

COMMIT;
