-- Create the notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on user_id for faster queries
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
-- Add index on is_read to quickly filter unread notifications
CREATE INDEX notifications_is_read_idx ON notifications(is_read);
-- Add index on created_at for ordering
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (e.g., to mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Turn on realtime for notifications so clients can subscribe
alter publication supabase_realtime add table notifications;
