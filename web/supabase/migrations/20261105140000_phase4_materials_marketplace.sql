-- F4-MAT: independent materials catalog with private inquiries.
-- Production release migration for the explicit Cubitat production target.

CREATE TABLE public.material_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 140),
  category text NOT NULL CHECK (category IN (
    'cemento', 'acero', 'madera', 'pintura', 'electricidad', 'plomeria',
    'pisos_revestimientos', 'puertas_ventanas', 'herramientas', 'agregados', 'otro'
  )),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 5000),
  price numeric(14,2) CHECK (price IS NULL OR price >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CUP', 'EUR', 'MIXED')),
  province text NOT NULL CHECK (char_length(btrim(province)) BETWEEN 2 AND 100),
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'limited', 'out_of_stock', 'made_to_order')),
  phone text,
  whatsapp text,
  photo_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photo_urls) <= 10),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'published', 'paused', 'rejected', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_listings_public_idx
  ON public.material_listings (province, category, updated_at DESC)
  WHERE status = 'published' AND availability <> 'out_of_stock';
CREATE INDEX material_listings_owner_idx
  ON public.material_listings (owner_id, updated_at DESC);

CREATE TABLE public.material_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.material_listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_inquiries_listing_idx ON public.material_inquiries (listing_id, created_at DESC);
CREATE INDEX material_inquiries_sender_idx ON public.material_inquiries (sender_id, created_at DESC);

CREATE TABLE public.material_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.material_listings(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve', 'reject', 'pause')),
  reason text,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (action = 'approve' OR char_length(btrim(reason)) BETWEEN 5 AND 500)
);
CREATE INDEX material_moderation_audit_listing_idx
  ON public.material_moderation_audit (listing_id, created_at DESC);

ALTER TABLE public.material_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_moderation_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_public_contactable_material(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id = p_listing_id AND listing.owner_id <> (SELECT auth.uid())
      AND listing.status = 'published' AND listing.availability <> 'out_of_stock'
  );
$$;
REVOKE ALL ON FUNCTION public.is_public_contactable_material(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_public_contactable_material(uuid) TO authenticated;

CREATE POLICY material_listings_public_read ON public.material_listings
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND availability <> 'out_of_stock');
CREATE POLICY material_listings_owner_read ON public.material_listings
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
CREATE POLICY material_listings_admin_read ON public.material_listings
  FOR SELECT TO authenticated USING (public.is_admin_aal2());
CREATE POLICY material_listings_owner_insert ON public.material_listings
  FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()) AND status = 'pending_review');
CREATE POLICY material_inquiries_sender_read ON public.material_inquiries
  FOR SELECT TO authenticated USING (sender_id = (SELECT auth.uid()));
CREATE POLICY material_inquiries_owner_read ON public.material_inquiries
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.material_listings listing
      WHERE listing.id = listing_id AND listing.owner_id = (SELECT auth.uid()))
  );
CREATE POLICY material_inquiries_admin_read ON public.material_inquiries
  FOR SELECT TO authenticated USING (public.is_admin_aal2());
CREATE POLICY material_inquiries_sender_insert ON public.material_inquiries
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = (SELECT auth.uid()) AND public.is_public_contactable_material(listing_id)
  );
CREATE POLICY material_moderation_audit_admin_read ON public.material_moderation_audit
  FOR SELECT TO authenticated USING (public.is_admin_aal2());

REVOKE ALL ON TABLE public.material_listings, public.material_inquiries,
  public.material_moderation_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, slug, title, category, description, price, currency, province,
  availability, phone, whatsapp, photo_urls, status, created_at, updated_at)
  ON public.material_listings TO anon, authenticated;
GRANT INSERT (owner_id, slug, title, category, description, price, currency,
  province, availability, phone, whatsapp, photo_urls)
  ON public.material_listings TO authenticated;
GRANT SELECT ON public.material_inquiries, public.material_moderation_audit TO authenticated;
GRANT INSERT (listing_id, sender_id, message) ON public.material_inquiries TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_material_listings()
RETURNS TABLE (
  id uuid, slug text, title text, category text, description text, price numeric,
  currency text, province text, availability text, phone text, whatsapp text,
  photo_urls text[], status text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT listing.id, listing.slug, listing.title, listing.category,
    listing.description, listing.price, listing.currency, listing.province,
    listing.availability, listing.phone, listing.whatsapp, listing.photo_urls,
    listing.status, listing.created_at, listing.updated_at
  FROM public.material_listings listing
  WHERE listing.owner_id = (SELECT auth.uid())
  ORDER BY listing.updated_at DESC LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_my_material_listings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_material_listings() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_material_listing(
  p_id uuid, p_title text, p_category text, p_description text, p_price numeric,
  p_currency text, p_province text, p_availability text, p_phone text,
  p_whatsapp text, p_photo_urls text[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.material_listings listing
    SET title = btrim(p_title), category = p_category,
      description = btrim(p_description), price = p_price, currency = p_currency,
      province = btrim(p_province), availability = p_availability,
      phone = p_phone, whatsapp = p_whatsapp,
      photo_urls = coalesce(p_photo_urls, '{}'), status = 'pending_review', updated_at = now()
    WHERE listing.id = p_id AND listing.owner_id = (SELECT auth.uid())
      AND listing.status <> 'archived';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material_listing_not_editable' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_material_listing(uuid, text, text, text, numeric, text, text, text, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_material_listing(uuid, text, text, text, numeric, text, text, text, text, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_material_listing(
  p_listing_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'pause') THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('reject', 'pause') AND char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'moderation_reason_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.material_listings listing
    SET status = CASE p_action WHEN 'approve' THEN 'published'
      WHEN 'reject' THEN 'rejected' ELSE 'paused' END, updated_at = now()
    WHERE listing.id = p_listing_id
      AND ((listing.status = 'pending_review' AND p_action IN ('approve', 'reject'))
        OR (listing.status = 'published' AND p_action = 'pause'));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material_listing_not_moderatable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.material_moderation_audit (listing_id, action, reason, actor_id)
  VALUES (p_listing_id, p_action, nullif(btrim(p_reason), ''), (SELECT auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_material_listing(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_material_listing(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_material_moderation_queue()
RETURNS TABLE (
  id uuid, title text, category text, description text, province text,
  status text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT listing.id, listing.title, listing.category,
    listing.description, listing.province, listing.status, listing.created_at
  FROM public.material_listings listing
  WHERE listing.status IN ('pending_review', 'published')
  ORDER BY (listing.status = 'pending_review') DESC, listing.created_at ASC
  LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_material_moderation_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_material_moderation_queue() TO authenticated;
