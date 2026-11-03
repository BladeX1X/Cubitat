-- Fase 3: atribución, oportunidades de agentes y cálculo auditable de comisiones.
-- Esta migración se aplica a Supabase DEV de forma explícita para la ronda de
-- pruebas Fase 3. No aplicarla con `db push` mientras existan migraciones
-- históricas pendientes; producción queda fuera de este trabajo.

CREATE TABLE IF NOT EXISTS public.agent_referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^AG-[0-9A-F]{8}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  lead_type text NOT NULL CHECK (lead_type IN ('property', 'client')),
  contact_name text NOT NULL CHECK (char_length(btrim(contact_name)) BETWEEN 2 AND 120),
  contact_phone text NOT NULL CHECK (
    contact_phone ~ '^[+0-9(). -]+$'
    AND char_length(regexp_replace(contact_phone, '[^0-9]', '', 'g')) BETWEEN 7 AND 15
  ),
  property_title text,
  location text,
  client_interest text,
  notes text,
  consent_confirmed boolean NOT NULL DEFAULT false CHECK (consent_confirmed),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (lead_type = 'property'
      AND property_title IS NOT NULL
      AND char_length(btrim(property_title)) BETWEEN 3 AND 160
      AND location IS NOT NULL
      AND char_length(btrim(location)) BETWEEN 2 AND 180)
    OR
    (lead_type = 'client'
      AND client_interest IS NOT NULL
      AND char_length(btrim(client_interest)) BETWEEN 3 AND 500)
  ),
  CHECK (notes IS NULL OR char_length(notes) <= 1000)
);

CREATE TABLE IF NOT EXISTS public.agent_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.agent_leads(id) ON DELETE RESTRICT,
  agent_id uuid NOT NULL,
  actor_id uuid,
  from_status text,
  to_status text NOT NULL CHECK (to_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (note IS NULL OR char_length(note) <= 1000)
);

CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.agent_leads(id) ON DELETE RESTRICT,
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  operation_reference text NOT NULL CHECK (char_length(btrim(operation_reference)) BETWEEN 3 AND 120),
  eligible_amount numeric(14,2) NOT NULL CHECK (eligible_amount > 0),
  rate_percent numeric(5,2) NOT NULL CHECK (rate_percent > 0 AND rate_percent <= 100),
  commission_amount numeric(14,2) GENERATED ALWAYS AS
    (round(eligible_amount * rate_percent / 100, 2)) STORED,
  currency text NOT NULL CHECK (currency IN ('USD', 'CUP')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'void')),
  payment_reference text,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  UNIQUE (agent_id, operation_reference),
  CHECK (payment_reference IS NULL OR char_length(payment_reference) <= 160),
  CHECK (note IS NULL OR char_length(note) <= 1000),
  CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.agent_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.agent_commissions(id) ON DELETE RESTRICT,
  agent_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('created', 'approved', 'paid', 'void')),
  previous_status text,
  new_status text NOT NULL CHECK (new_status IN ('pending', 'approved', 'paid', 'void')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (note IS NULL OR char_length(note) <= 1000)
);

CREATE INDEX IF NOT EXISTS agent_leads_agent_created_idx
  ON public.agent_leads (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_leads_admin_queue_idx
  ON public.agent_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_lead_events_lead_created_idx
  ON public.agent_lead_events (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_commissions_agent_created_idx
  ON public.agent_commissions (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_commission_events_commission_created_idx
  ON public.agent_commission_events (commission_id, created_at DESC);

ALTER TABLE public.agent_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commission_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agent_referral_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.agent_leads FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.agent_lead_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.agent_commissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.agent_commission_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.agent_referral_links TO authenticated;
GRANT SELECT ON TABLE public.agent_leads TO authenticated;
GRANT SELECT ON TABLE public.agent_lead_events TO authenticated;
GRANT SELECT ON TABLE public.agent_commissions TO authenticated;
GRANT SELECT ON TABLE public.agent_commission_events TO authenticated;

CREATE POLICY agent_referral_links_owner_read ON public.agent_referral_links
  FOR SELECT TO authenticated USING (
    (agent_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles AS owner
      WHERE owner.id = agent_id AND owner.role IN ('agent'::public.user_role, 'admin'::public.user_role)
        AND owner.verification_status = 'verified'
    )) OR public.is_admin_aal2()
  );
CREATE POLICY agent_leads_owner_read ON public.agent_leads
  FOR SELECT TO authenticated USING (
    (agent_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles AS owner
      WHERE owner.id = agent_id AND owner.role IN ('agent'::public.user_role, 'admin'::public.user_role)
        AND owner.verification_status = 'verified'
    )) OR public.is_admin_aal2()
  );
CREATE POLICY agent_lead_events_owner_read ON public.agent_lead_events
  FOR SELECT TO authenticated USING (
    (agent_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles AS owner
      WHERE owner.id = agent_id AND owner.role IN ('agent'::public.user_role, 'admin'::public.user_role)
        AND owner.verification_status = 'verified'
    )) OR public.is_admin_aal2()
  );
CREATE POLICY agent_commissions_owner_read ON public.agent_commissions
  FOR SELECT TO authenticated USING (
    (agent_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles AS owner
      WHERE owner.id = agent_id AND owner.role IN ('agent'::public.user_role, 'admin'::public.user_role)
        AND owner.verification_status = 'verified'
    )) OR public.is_admin_aal2()
  );
CREATE POLICY agent_commission_events_owner_read ON public.agent_commission_events
  FOR SELECT TO authenticated USING (
    (agent_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles AS owner
      WHERE owner.id = agent_id AND owner.role IN ('agent'::public.user_role, 'admin'::public.user_role)
        AND owner.verification_status = 'verified'
    )) OR public.is_admin_aal2()
  );

CREATE OR REPLACE FUNCTION public.ensure_agent_referral_link()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_agent_id uuid := auth.uid();
  v_code text;
BEGIN
  IF v_agent_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_agent_id
      AND role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;

  SELECT code INTO v_code
  FROM public.agent_referral_links
  WHERE agent_id = v_agent_id AND active;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  v_code := 'AG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.agent_referral_links (agent_id, code)
  VALUES (v_agent_id, v_code)
  ON CONFLICT (agent_id) DO UPDATE
    SET active = true, updated_at = now()
  RETURNING code INTO v_code;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_agent_lead(
  p_lead_type text,
  p_contact_name text,
  p_contact_phone text,
  p_property_title text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_client_interest text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_consent_confirmed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_agent_id uuid := auth.uid();
  v_lead_id uuid;
BEGIN
  IF v_agent_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_agent_id
      AND role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;

  p_contact_name := btrim(p_contact_name);
  p_contact_phone := btrim(p_contact_phone);
  p_property_title := nullif(btrim(p_property_title), '');
  p_location := nullif(btrim(p_location), '');
  p_client_interest := nullif(btrim(p_client_interest), '');
  p_notes := nullif(btrim(p_notes), '');

  IF p_consent_confirmed IS DISTINCT FROM true
    OR p_contact_name IS NULL OR char_length(p_contact_name) NOT BETWEEN 2 AND 120
    OR p_contact_phone IS NULL OR p_contact_phone !~ '^[+0-9(). -]+$'
    OR char_length(regexp_replace(p_contact_phone, '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15
    OR (p_notes IS NOT NULL AND char_length(p_notes) > 1000)
    OR p_lead_type NOT IN ('property', 'client')
    OR (p_lead_type = 'property' AND (
      p_property_title IS NULL OR char_length(p_property_title) NOT BETWEEN 3 AND 160
      OR p_location IS NULL OR char_length(p_location) NOT BETWEEN 2 AND 180
    ))
    OR (p_lead_type = 'client' AND (
      p_client_interest IS NULL OR char_length(p_client_interest) NOT BETWEEN 3 AND 500
    )) THEN
    RAISE EXCEPTION 'Invalid agent lead.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.agent_leads (
    agent_id, lead_type, contact_name, contact_phone,
    property_title, location, client_interest, notes, consent_confirmed
  ) VALUES (
    v_agent_id, p_lead_type, p_contact_name, p_contact_phone,
    p_property_title, p_location, p_client_interest, p_notes, true
  ) RETURNING id INTO v_lead_id;

  INSERT INTO public.agent_lead_events (lead_id, agent_id, actor_id, to_status, note)
  VALUES (v_lead_id, v_agent_id, v_agent_id, 'new', 'Oportunidad registrada');
  RETURN v_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agent_lead_status(
  p_lead_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_agent_id uuid;
  v_previous text;
  v_is_admin boolean := public.is_admin_aal2();
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_actor_id AND role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified agent required.' USING ERRCODE = '42501';
  END IF;
  SELECT agent_id, status INTO v_agent_id, v_previous
  FROM public.agent_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found.' USING ERRCODE = '22023'; END IF;
  IF NOT v_is_admin AND v_agent_id <> v_actor_id THEN
    RAISE EXCEPTION 'Lead owner required.' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('new', 'contacted', 'qualified', 'converted', 'lost')
    OR (NOT v_is_admin AND p_status IN ('converted', 'lost'))
    OR (v_previous = 'converted' AND p_status <> 'converted')
    OR (v_previous = 'lost' AND p_status NOT IN ('lost', 'contacted'))
    OR (v_previous = 'new' AND p_status NOT IN ('contacted', 'qualified', 'lost'))
    OR (v_previous = 'contacted' AND p_status NOT IN ('qualified', 'lost'))
    OR (v_previous = 'qualified' AND p_status NOT IN ('contacted', 'converted', 'lost')) THEN
    RAISE EXCEPTION 'Lead status transition not allowed.' USING ERRCODE = '22023';
  END IF;
  p_note := nullif(btrim(p_note), '');
  IF v_is_admin AND p_status IN ('converted', 'lost') AND p_note IS NULL THEN
    RAISE EXCEPTION 'Review note required for final status.' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 1000 THEN
    RAISE EXCEPTION 'Lead note too long.' USING ERRCODE = '22023';
  END IF;
  IF v_previous = p_status THEN RETURN; END IF;

  UPDATE public.agent_leads
  SET status = p_status, updated_at = now()
  WHERE id = p_lead_id;
  INSERT INTO public.agent_lead_events (lead_id, agent_id, actor_id, from_status, to_status, note)
  VALUES (p_lead_id, v_agent_id, v_actor_id, v_previous, p_status, p_note);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_agent_commission(
  p_lead_id uuid,
  p_operation_reference text,
  p_eligible_amount numeric,
  p_rate_percent numeric,
  p_currency text,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_agent_id uuid;
  v_commission_id uuid;
BEGIN
  IF NOT public.is_admin_aal2() OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;
  SELECT agent_id INTO v_agent_id
  FROM public.agent_leads
  WHERE id = p_lead_id AND status = 'converted';
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Converted lead required.' USING ERRCODE = '22023';
  END IF;
  p_operation_reference := nullif(btrim(p_operation_reference), '');
  p_note := nullif(btrim(p_note), '');
  IF p_operation_reference IS NULL
    OR char_length(p_operation_reference) NOT BETWEEN 3 AND 120
    OR p_eligible_amount IS NULL OR p_eligible_amount <= 0
    OR p_rate_percent IS NULL OR p_rate_percent <= 0 OR p_rate_percent > 100
    OR p_currency NOT IN ('USD', 'CUP')
    OR (p_note IS NOT NULL AND char_length(p_note) > 1000) THEN
    RAISE EXCEPTION 'Invalid commission terms.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.agent_commissions (
    lead_id, agent_id, operation_reference, eligible_amount,
    rate_percent, currency, note, created_by
  ) VALUES (
    p_lead_id, v_agent_id, p_operation_reference, p_eligible_amount,
    p_rate_percent, p_currency, p_note, v_actor_id
  ) RETURNING id INTO v_commission_id;

  INSERT INTO public.agent_commission_events (
    commission_id, agent_id, actor_id, action, new_status, note
  ) VALUES (v_commission_id, v_agent_id, v_actor_id, 'created', 'pending', p_note);
  RETURN v_commission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agent_commission_status(
  p_commission_id uuid,
  p_status text,
  p_payment_reference text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_agent_id uuid;
  v_previous text;
BEGIN
  IF NOT public.is_admin_aal2() OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;
  SELECT agent_id, status INTO v_agent_id, v_previous
  FROM public.agent_commissions WHERE id = p_commission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commission not found.' USING ERRCODE = '22023'; END IF;
  IF p_status NOT IN ('approved', 'paid', 'void')
    OR (v_previous = 'pending' AND p_status NOT IN ('approved', 'void'))
    OR (v_previous = 'approved' AND p_status NOT IN ('paid', 'void'))
    OR v_previous IN ('paid', 'void') THEN
    RAISE EXCEPTION 'Commission transition not allowed.' USING ERRCODE = '22023';
  END IF;
  p_payment_reference := nullif(btrim(p_payment_reference), '');
  p_note := nullif(btrim(p_note), '');
  IF p_status = 'paid' AND p_payment_reference IS NULL THEN
    RAISE EXCEPTION 'Payment reference required.' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'void' AND p_note IS NULL THEN
    RAISE EXCEPTION 'Void reason required.' USING ERRCODE = '22023';
  END IF;
  IF p_payment_reference IS NOT NULL AND char_length(p_payment_reference) > 160
    OR p_note IS NOT NULL AND char_length(p_note) > 1000 THEN
    RAISE EXCEPTION 'Commission note or payment reference too long.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.agent_commissions
  SET status = p_status,
      payment_reference = CASE WHEN p_status = 'paid' THEN p_payment_reference ELSE payment_reference END,
      note = COALESCE(p_note, note),
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
      paid_at = CASE WHEN p_status = 'paid' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_commission_id;
  INSERT INTO public.agent_commission_events (
    commission_id, agent_id, actor_id, action, previous_status, new_status, note
  ) VALUES (
    p_commission_id, v_agent_id, v_actor_id, p_status, v_previous, p_status, p_note
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_contact_trusted(
  p_property_id uuid,
  p_contact_name text,
  p_contact_phone text,
  p_message text,
  p_referral_code text,
  p_contact_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_contact_id uuid;
  v_referral_code text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  p_contact_name := btrim(p_contact_name);
  p_contact_phone := btrim(p_contact_phone);
  p_message := btrim(p_message);
  IF p_contact_name IS NULL OR p_contact_phone IS NULL OR p_message IS NULL
    OR char_length(p_contact_name) NOT BETWEEN 2 AND 120
    OR char_length(p_contact_phone) NOT BETWEEN 6 AND 40
    OR char_length(p_message) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'Invalid contact submission.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND status = 'published'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Published property not found.' USING ERRCODE = '22023';
  END IF;

  SELECT link.code INTO v_referral_code
  FROM public.agent_referral_links AS link
  JOIN public.profiles AS agent ON agent.id = link.agent_id
  WHERE link.code = upper(btrim(COALESCE(p_referral_code, '')))
    AND link.active
    AND agent.role IN ('agent'::public.user_role, 'admin'::public.user_role)
    AND agent.verification_status = 'verified'
    AND (p_contact_user_id IS NULL OR p_contact_user_id <> link.agent_id)
  LIMIT 1;

  INSERT INTO public.contacts (
    property_id, contact_name, contact_phone, message, referral_id, source
  ) VALUES (
    p_property_id, p_contact_name, p_contact_phone, p_message,
    v_referral_code,
    CASE WHEN v_referral_code IS NULL THEN 'detail' ELSE 'agent_referral' END
  ) RETURNING id INTO v_contact_id;
  RETURN v_contact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_agent_referral_link() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_agent_referral_link() TO authenticated;
REVOKE ALL ON FUNCTION public.create_agent_lead(text, text, text, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agent_lead(text, text, text, text, text, text, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.update_agent_lead_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_agent_lead_status(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_agent_commission(uuid, text, numeric, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_commission(uuid, text, numeric, numeric, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.update_agent_commission_status(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_commission_status(uuid, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text, text, uuid) TO service_role;

DROP POLICY IF EXISTS "Allow read for owners and admins" ON public.contacts;
CREATE POLICY "Allow read for owners admins and attributed agents"
ON public.contacts FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = contacts.property_id
      AND properties.user_id = auth.uid()
  )
  OR public.is_admin_aal2()
  OR EXISTS (
    SELECT 1
    FROM public.agent_referral_links AS link
    JOIN public.profiles AS agent ON agent.id = link.agent_id
    WHERE link.code = contacts.referral_id
      AND link.agent_id = auth.uid()
      AND link.active
      AND agent.role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND agent.verification_status = 'verified'
  )
);

