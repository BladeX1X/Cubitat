const PUBLIC_PROPERTY_FIELDS = 'id,location,operation,property_type,status,updated_at'

/** Read only fields intended for the public property catalog via the site's Worker proxy. */
export async function readPublicSitemapProperties({ siteUrl, fetchImpl = fetch }) {
  const url = new URL('/api/supabase/rest/v1/properties', siteUrl)
  url.searchParams.set('select', PUBLIC_PROPERTY_FIELDS)
  url.searchParams.set('status', 'eq.published')

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Public sitemap inventory request failed (${response.status})`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('Public sitemap inventory response must be an array')
  }

  return data
}
