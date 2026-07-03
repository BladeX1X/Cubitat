-- Añadir nuevos campos para soportar el formulario de publicación
ALTER TABLE properties
ADD COLUMN user_id UUID REFERENCES auth.users(id),
ADD COLUMN images TEXT[] DEFAULT '{}',
ADD COLUMN features JSONB DEFAULT '{}'::jsonb,
ADD COLUMN contact_info JSONB DEFAULT '{}'::jsonb;

-- Actualizar la política RLS para inserción y actualización para que el usuario sea dueño de la propiedad
DROP POLICY IF EXISTS "Allow anonymous inserts" ON properties;
DROP POLICY IF EXISTS "Allow update for drafts" ON properties;

-- Inserción: Solo usuarios autenticados pueden insertar, y user_id debe ser su propio ID
CREATE POLICY "Users can insert their own properties"
ON properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Actualización: Solo dueños pueden actualizar sus propias propiedades
CREATE POLICY "Users can update their own properties"
ON properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Borrado: Solo dueños pueden borrar sus propiedades
CREATE POLICY "Users can delete their own properties"
ON properties
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
