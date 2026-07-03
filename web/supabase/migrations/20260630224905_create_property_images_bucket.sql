-- Insert bucket for property images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('property_images', 'property_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies

-- Public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'property_images' );

-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property_images' 
    -- The owner column is filled with auth.uid() automatically by Supabase storage if not explicitly set, 
    -- but usually it's best to check that the path starts with their user_id to organize things
    -- AND (storage.foldername(name))[1] = auth.uid()::text 
);

-- Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'property_images' AND auth.uid() = owner );

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'property_images' AND auth.uid() = owner );
