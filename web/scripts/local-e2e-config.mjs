const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

export function parseLocalSupabaseStatus(output) {
  const values = new Map()
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (!match) continue
    values.set(match[1], match[2].replace(/^"|"$/g, ''))
  }

  const url = values.get('API_URL')
  const anonKey = values.get('ANON_KEY')
  if (!url || !anonKey) throw new Error('Supabase local no devolvió API_URL y ANON_KEY.')

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('La URL de Supabase local no es válida.')
  }
  if (!LOOPBACK_HOSTS.has(parsedUrl.hostname.toLowerCase()) || !['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('El servidor E2E solo admite Supabase local en loopback.')
  }

  return { url: parsedUrl.origin, anonKey }
}

