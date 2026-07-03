-- 1. Crear el enum de roles de usuario
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'agent');

-- 2. Crear tabla de perfiles publicos vinculada a auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'buyer',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politica publica para leer perfiles
CREATE POLICY "Allow public read for profiles" ON profiles
    FOR SELECT USING (true);

-- Politica para que los usuarios puedan actualizar unicamente su propio perfil
CREATE POLICY "Allow individual update of own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Crear funcion para gestionar la creacion automatica de perfil al registrar un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_metadata->>'full_name', ''),
        coalesce((new.raw_user_metadata->>'role')::user_role, 'buyer'::user_role)
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asignar el disparador (trigger) a auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
