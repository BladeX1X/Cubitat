-- Modificar la restricción de clave foránea en properties.user_id para admitir borrado en cascada
-- Esto asegura que al eliminar un usuario de auth.users, todas sus propiedades asociadas se eliminen automáticamente.

ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_user_id_fkey;

ALTER TABLE public.properties 
ADD CONSTRAINT properties_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
