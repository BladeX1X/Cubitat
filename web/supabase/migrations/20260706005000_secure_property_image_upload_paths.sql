-- 1. Eliminar la política anterior no restrictiva
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- 2. Crear la nueva política de subida (INSERT) con restricción estricta de subcarpeta del usuario
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property_images' 
    AND (storage.foldername(name))[1] = auth.uid()::text 
);
