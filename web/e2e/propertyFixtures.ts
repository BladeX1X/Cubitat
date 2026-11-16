import type { Page } from '@playwright/test'

/** Keeps ancillary authenticated reads on the browser side of the test; API-specific routes can fall back to their fixtures. */
export async function mockDirectSupabaseReads(page: Page) {
  await page.route('**/rest/v1/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    if (route.request().method() !== 'GET'
      && !pathname.includes('/rest/v1/rpc/')) return route.fallback()
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

const publishedProperties = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Casa QA en renta en La Habana',
    location: 'Plaza de la Revolución, La Habana',
    description: 'Vivienda de prueba para recorrer los filtros de búsqueda.',
    zone_id: null,
    operation: 'alquiler',
    property_type: 'casa',
    price_usd: 500,
    bedrooms: 2,
    bathrooms: 1,
    parking: 0,
    area_m2: 74,
    age_years: 10,
    amenities: [],
    badge: null,
    status: 'published',
    cover_tone: '#e5e7eb',
    cover_image: null,
    images: [],
    coordinates: { latitude: 23.13, longitude: -82.39 },
    contact_info: { name: 'Anunciante QA', phone: '+5350000000' },
    features: [],
    user_id: '22222222-2222-4222-8222-222222222222',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Apartamento QA en venta',
    location: 'Plaza de la Revolución, La Habana',
    description: 'Segunda vivienda sintética para validar el filtro de operación.',
    zone_id: null,
    operation: 'venta',
    property_type: 'apartamento',
    price_usd: 68000,
    bedrooms: 2,
    bathrooms: 1,
    parking: 0,
    area_m2: 74,
    age_years: 10,
    amenities: [],
    badge: null,
    status: 'published',
    cover_tone: '#e5e7eb',
    cover_image: null,
    images: [],
    coordinates: { latitude: 23.13, longitude: -82.39 },
    contact_info: { name: 'Anunciante QA', phone: '+5350000001' },
    features: [],
    user_id: '44444444-4444-4444-8444-444444444444',
  },
]

/** Makes browse-flow E2Es independent from a locally running Supabase stack. */
export async function mockPublishedProperties(page: Page) {
  await page.route('**/rest/v1/properties**', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    const url = new URL(route.request().url())
    let results = publishedProperties.filter((property) => {
      const equals = (name: string, value: string | null) =>
        !value || value === `eq.${property[name as keyof typeof property]}`

      if (!equals('status', url.searchParams.get('status'))) return false
      if (!equals('property_type', url.searchParams.get('property_type'))) return false
      if (!equals('operation', url.searchParams.get('operation'))) return false
      if (!equals('id', url.searchParams.get('id'))) return false

      const idFilter = url.searchParams.get('id')
      if (idFilter?.startsWith('neq.') && property.id === idFilter.slice(4)) return false
      if (idFilter?.startsWith('not.in.(')) {
        const excludedIds = idFilter.slice('not.in.('.length, -1).split(',')
        if (excludedIds.includes(property.id)) return false
      }

      const locationFilter = url.searchParams.get('location')
      if (locationFilter?.startsWith('ilike.')) {
        const fragment = locationFilter.slice('ilike.'.length).replace(/^%|%$/g, '').toLocaleLowerCase()
        if (!property.location.toLocaleLowerCase().includes(fragment)) return false
      }

      return true
    })
    const limitValue = url.searchParams.get('limit')
    if (limitValue !== null) {
      const limit = Number(limitValue)
      if (Number.isInteger(limit) && limit >= 0) results = results.slice(0, limit)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${results.length - 1}/${results.length}` },
      body: JSON.stringify(results),
    })
  })
}
