import { createClient } from '@supabase/supabase-js'
import { logSafeEvent } from './logger'

const isServer = typeof window === 'undefined'
const supabaseUrl = isServer
  // Never silently fall back to a real project when a deployment is misconfigured.
  ? (import.meta.env.VITE_SUPABASE_URL || 'https://dev-supabase.invalid')
  : (window.location.origin + '/api/supabase')
const supabaseAnonKey = isServer
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  : 'dummy-key-safe-from-browsers'

if (!supabaseUrl || !supabaseAnonKey) {
  logSafeEvent({
    module: 'core',
    action: 'supabase_init',
    level: 'warn',
    code: 'ENV_KEY_MISSING',
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'cubitat-auth-token',
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
})
