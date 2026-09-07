import { describe, expect, it } from 'vitest'
import { buildInventorySeoRoutes } from '../../../scripts/sitemap-routes.mjs'

const locations = {
  Artemisa: ['Artemisa', 'Bahía Honda'],
  'La Habana': ['Plaza de la Revolución', 'Playa'],
}

describe('buildInventorySeoRoutes', () => {
  it('includes only routes backed by published inventory', () => {
    const routes = buildInventorySeoRoutes([
      { location: 'Vedado, Plaza de la Revolución, La Habana', operation: 'venta', property_type: 'apartamento', status: 'published' },
      { location: 'Artemisa, Artemisa', operation: 'alquiler', property_type: 'casa', status: 'published' },
      { location: 'Bahía Honda, Artemisa', operation: 'venta', property_type: 'terreno', status: 'draft' },
    ], locations)

    expect(routes.map(({ path }) => path)).toEqual([
      '/venta/la-habana',
      '/apartamentos-en-venta/la-habana',
      '/venta/la-habana/plaza-de-la-revolucion',
      '/renta/artemisa',
      '/casas-en-renta/artemisa',
      '/renta/artemisa/artemisa',
    ])
    expect(routes.some(({ path }) => path.includes('bahia-honda'))).toBe(false)
  })

  it('deduplicates landing pages shared by multiple properties', () => {
    const property = { location: 'Playa, La Habana', operation: 'venta', property_type: 'casa', status: 'published' }
    expect(buildInventorySeoRoutes([property, property], locations)).toHaveLength(3)
  })

  it('keeps the newest real update date for shared landing pages', () => {
    const older = { location: 'Playa, La Habana', operation: 'venta', property_type: 'casa', status: 'published', updated_at: '2026-07-30T10:00:00.000Z' }
    const newer = { ...older, updated_at: '2026-08-02T12:00:00.000Z' }

    expect(buildInventorySeoRoutes([newer, older], locations)).toEqual([
      { path: '/venta/la-habana', priority: '0.86', changefreq: 'daily', lastmod: newer.updated_at },
      { path: '/casas-en-venta/la-habana', priority: '0.84', changefreq: 'daily', lastmod: newer.updated_at },
      { path: '/venta/la-habana/playa', priority: '0.72', changefreq: 'daily', lastmod: newer.updated_at },
    ])
  })
})
