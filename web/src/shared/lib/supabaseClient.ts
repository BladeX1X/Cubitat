import { createClient } from '@supabase/supabase-js'

const isServer = typeof window === 'undefined'
const supabaseUrl = isServer
  ? (import.meta.env.VITE_SUPABASE_URL || 'https://tohjzoncoosvjbjcakdl.supabase.co')
  : (window.location.origin + '/api/supabase')
const supabaseAnonKey = isServer
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  : 'dummy-key-safe-from-browsers'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL y Anon Key no están definidas en el entorno.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'cubitat-auth-token',
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})
