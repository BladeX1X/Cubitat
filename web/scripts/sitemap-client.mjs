import { createClient } from '@supabase/supabase-js'

export function createSitemapClient(supabaseUrl, supabaseAnonKey, siteUrl) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Origin: siteUrl } },
  })
}
