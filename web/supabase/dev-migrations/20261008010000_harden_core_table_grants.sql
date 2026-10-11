-- DEV ONLY: reduce Data API table privileges to the operations used by Cubitat.
-- RLS policies remain the row-level authorization boundary.

REVOKE ALL ON TABLE public.contacts,
  public.notifications,
  public.profiles,
  public.properties,
  public.property_reports
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.contacts TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT SELECT ON TABLE public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.properties TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.property_reports TO authenticated;
