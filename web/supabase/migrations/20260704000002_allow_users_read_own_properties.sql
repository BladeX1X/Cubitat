CREATE POLICY "Users can read their own properties"
ON properties
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
