-- Combine equivalent OR-based RLS policies so each authenticated operation
-- evaluates one policy per table while preserving owner and AAL2 admin access.

DROP POLICY IF EXISTS "Allow public read for published properties" ON public.properties;
DROP POLICY IF EXISTS "Admin can read all properties" ON public.properties;
DROP POLICY IF EXISTS "Users can read their own properties" ON public.properties;
DROP POLICY IF EXISTS "Read visible properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated can read visible properties" ON public.properties;
CREATE POLICY "Read visible properties"
  ON public.properties FOR SELECT TO anon
  USING (status = 'published'::public.property_status);
CREATE POLICY "Authenticated can read visible properties"
  ON public.properties FOR SELECT TO authenticated
  USING (
    status = 'published'::public.property_status
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin_aal2())
  );

DROP POLICY IF EXISTS "Admin can delete any property" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners and AAL2 admins can delete properties" ON public.properties;
CREATE POLICY "Owners and AAL2 admins can delete properties"
  ON public.properties FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin_aal2()));

DROP POLICY IF EXISTS "Admin can update any property" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners and AAL2 admins can update properties" ON public.properties;
CREATE POLICY "Owners and AAL2 admins can update properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin_aal2()))
  WITH CHECK (
    (SELECT public.is_admin_aal2())
    OR (
      user_id = (SELECT auth.uid())
      AND status = ANY (ARRAY[
        'draft'::public.property_status,
        'pending_review'::public.property_status,
        'paused'::public.property_status,
        'owner_hidden'::public.property_status
      ])
    )
  );

DROP POLICY IF EXISTS "Usuarios ven sus propias solicitudes KYC" ON public.kyc_requests;
DROP POLICY IF EXISTS "Admins gestionan solicitudes KYC" ON public.kyc_requests;
DROP POLICY IF EXISTS "Owners and AAL2 admins can read KYC requests" ON public.kyc_requests;
CREATE POLICY "Owners and AAL2 admins can read KYC requests"
  ON public.kyc_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin_aal2()));

-- The owner policy already includes the AAL2 admin branch, so the second
-- permissive SELECT policy was redundant.
DROP POLICY IF EXISTS "Admins manage property verification requests"
  ON public.property_verification_requests;
ALTER POLICY "Property owners read own verification requests"
  ON public.property_verification_requests
  USING (
    (SELECT auth.uid()) = owner_id
    OR (SELECT public.is_admin_aal2())
  );
