-- 1. Crear tipo enumerado para la operacion del anuncio
CREATE TYPE operation_type AS ENUM ('venta', 'alquiler', 'permuta');

-- 2. Crear tipo enumerado para el tipo de propiedad
CREATE TYPE property_type AS ENUM ('casa', 'apartamento', 'terreno');

-- 3. Crear tipo enumerado para el estado de publicacion
CREATE TYPE property_status AS ENUM ('published', 'pending_review', 'paused', 'draft');

-- 4. Crear la tabla de Propiedades
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    operation operation_type NOT NULL,
    property_type property_type NOT NULL,
    price_usd NUMERIC,
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms INTEGER NOT NULL DEFAULT 0,
    parking INTEGER NOT NULL DEFAULT 0,
    area_m2 NUMERIC NOT NULL,
    age_years INTEGER,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    badge TEXT,
    status property_status NOT NULL DEFAULT 'draft',
    cover_tone TEXT DEFAULT '#f3f4f6',
    cover_image TEXT,
    coordinates JSONB, -- { latitude, longitude }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Politicas publicas (Cualquiera puede leer propiedades publicadas)
CREATE POLICY "Allow public read for published properties" ON properties
    FOR SELECT USING (status = 'published');

-- Politicas anonimas para insercion (Cualquiera puede publicar un borrador)
CREATE POLICY "Allow anonymous inserts" ON properties
    FOR INSERT WITH CHECK (true);

-- Politicas para actualizacion de borradores anonimos (Ejemplo basico para el MVP)
CREATE POLICY "Allow update for drafts" ON properties
    FOR UPDATE USING (status = 'draft');
