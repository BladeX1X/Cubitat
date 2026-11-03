-- Prevent inherited table defaults from granting destructive or structural
-- privileges on private advertiser contact details.
BEGIN;
REVOKE ALL ON TABLE public.property_contact_details
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.property_contact_details
  TO authenticated, service_role;
COMMIT;
