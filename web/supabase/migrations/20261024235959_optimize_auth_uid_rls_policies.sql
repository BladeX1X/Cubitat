-- Evaluate auth.uid() once per statement instead of once per candidate row.
-- The expressions are semantically equivalent and preserve each policy's roles.

ALTER POLICY "Allow read for owners admins and attributed agents"
ON public.contacts
USING (
  EXISTS (
    SELECT 1
    FROM public.properties
    WHERE properties.id = contacts.property_id
      AND properties.user_id = (SELECT auth.uid())
  )
  OR public.is_admin_aal2()
  OR EXISTS (
    SELECT 1
    FROM public.agent_referral_links link
    JOIN public.profiles agent ON agent.id = link.agent_id
    WHERE link.code = contacts.referral_id
      AND link.agent_id = (SELECT auth.uid())
      AND link.active
      AND agent.role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND agent.verification_status = 'verified'
  )
);

ALTER POLICY "Usuarios ven sus propias solicitudes KYC"
ON public.kyc_requests
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own notifications"
ON public.notifications
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own notifications"
ON public.notifications
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Allow individual update of own profile"
ON public.profiles
USING ((SELECT auth.uid()) = id);

ALTER POLICY "Profiles are readable by owner or admin"
ON public.profiles
USING (id = (SELECT auth.uid()) OR public.is_admin_aal2());

ALTER POLICY "Users can delete their own properties"
ON public.properties
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert their own properties"
ON public.properties
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND status = ANY (ARRAY['draft'::public.property_status, 'pending_review'::public.property_status])
);

ALTER POLICY "Users can read their own properties"
ON public.properties
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own properties"
ON public.properties
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND status = ANY (ARRAY[
    'draft'::public.property_status,
    'pending_review'::public.property_status,
    'paused'::public.property_status,
    'owner_hidden'::public.property_status
  ])
);

ALTER POLICY "Property owners read own verification requests"
ON public.property_verification_requests
USING ((SELECT auth.uid()) = owner_id OR public.is_admin_aal2());

ALTER POLICY push_subscriptions_delete_own
ON public.push_subscriptions
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY push_subscriptions_insert_own
ON public.push_subscriptions
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY push_subscriptions_select_own
ON public.push_subscriptions
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY push_subscriptions_update_own
ON public.push_subscriptions
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can save properties"
ON public.saved_properties
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can unsave properties"
ON public.saved_properties
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own saved properties"
ON public.saved_properties
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY search_alerts_delete_own
ON public.search_alerts
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY search_alerts_insert_own
ON public.search_alerts
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY search_alerts_select_own
ON public.search_alerts
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY search_alerts_update_own
ON public.search_alerts
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';
