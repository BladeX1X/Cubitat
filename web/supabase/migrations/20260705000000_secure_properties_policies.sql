-- Drop old insecure policies
DROP POLICY IF EXISTS "Allow anonymous inserts" ON properties;
DROP POLICY IF EXISTS "Allow update for drafts" ON properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;

-- Create secure insert policy
CREATE POLICY "Users can insert their own properties"
ON properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create secure update policy
CREATE POLICY "Users can update their own properties"
ON properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create secure delete policy
CREATE POLICY "Users can delete their own properties"
ON properties
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
