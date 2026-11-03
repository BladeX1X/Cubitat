BEGIN;
-- The client only marks notifications as read. Email delivery metadata is
-- maintained by the trusted dispatcher and notification content is immutable.
REVOKE UPDATE ON TABLE public.notifications
  FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id,
  user_id,
  title,
  message,
  is_read,
  created_at,
  event_key,
  action_path,
  email_delivery_status,
  email_attempts,
  email_last_attempt_at,
  email_sent_at
)
ON TABLE public.notifications
FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_read)
  ON TABLE public.notifications
  TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
