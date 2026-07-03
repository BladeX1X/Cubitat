import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL y Anon Key no están definidas en el entorno. Asegúrate de configurar el archivo .env')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
