export function resolveSitemapMode({ requestedMode, supabaseUrl, supabaseAnonKey }) {
  if (requestedMode === 'static') return 'static'
  if (supabaseUrl && supabaseAnonKey) return 'dynamic'
  if (supabaseAnonKey && !supabaseUrl) {
    throw new Error('Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for a dynamic sitemap.')
  }
  if (!supabaseAnonKey) return 'proxy'
  throw new Error('Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for a dynamic sitemap.')
}

export function shouldWriteSourceSitemap({ mode, phase2Dev }) {
  return mode === 'dynamic' && !phase2Dev
}
