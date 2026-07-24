-- Crear la tabla de contactos (leads)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    referral_id TEXT,
    source TEXT DEFAULT 'direct',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Política de inserción pública: Cualquiera puede mandar mensajes de contacto
CREATE POLICY "Allow public insert for contacts" ON contacts
    FOR INSERT WITH CHECK (true);

-- Política de lectura: Solo el propietario del anuncio o un administrador pueden leer los contactos
CREATE POLICY "Allow read for owners and admins" ON contacts
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM properties WHERE id = contacts.property_id
        ) OR (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    );
