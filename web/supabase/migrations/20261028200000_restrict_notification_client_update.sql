-- Authenticated users only need to mark their own notifications as read.
-- Keep email delivery state writable only through the service-role column grants.
REVOKE UPDATE ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;
