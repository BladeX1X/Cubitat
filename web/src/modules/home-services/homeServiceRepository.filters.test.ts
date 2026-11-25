import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), contains: vi.fn(), or: vi.fn(),
  }
  Object.values(query).forEach((method) => method.mockReturnValue(query))
  return { query, from: vi.fn(() => query) }
})

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { from } }))
vi.mock('../../shared/lib/logger', () => ({ logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'test') }))

import { fetchHomeServiceProviders, fetchHomeServiceProvidersForMap } from './homeServiceRepository'

describe('fetchHomeServiceProviders filters and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(query).filter((method) => typeof method === 'function').forEach((method) => method.mockReturnValue(query))
    Object.assign(query, {
      data: [{ id: '1', slug: 'fontanero', display_name: 'Fontanero del barrio', category: 'plomeria', description: 'Reparaciones de tuberías', province: 'La Habana', municipalities: ['Playa'], gallery_urls: [], updated_at: '2026-11-05T00:00:00Z' }],
      error: null,
      count: 61,
    })
  })

  it('filters by name, category, province and municipality while returning the exact count', async () => {
    const result = await fetchHomeServiceProviders({ category: 'plomeria', province: 'La Habana', municipality: 'Playa', search: 'fontanero', offset: 24 })

    expect(from).toHaveBeenCalledWith('home_service_providers')
    expect(query.eq).toHaveBeenCalledWith('status', 'published')
    expect(query.eq).toHaveBeenCalledWith('category', 'plomeria')
    expect(query.eq).toHaveBeenCalledWith('province', 'La Habana')
    expect(query.contains).toHaveBeenCalledWith('municipalities', ['Playa'])
    expect(query.or).toHaveBeenCalledWith('display_name.ilike.%fontanero%,description.ilike.%fontanero%')
    expect(query.range).toHaveBeenCalledWith(24, 47)
    expect(result).toMatchObject({ total: 61, items: [{ id: '1', displayName: 'Fontanero del barrio' }] })
  })

  it('loads every filtered map page while retaining only public coordinates and cover references', async () => {
    const rows = Array.from({ length: 61 }, (_, index) => ({
      id: `service-${index}`, slug: `service-${index}`, display_name: `Servicio ${index}`,
      category: 'plomeria', description: 'Reparación', province: 'La Habana', municipalities: ['Playa'],
      coordinates: { latitude: 23.11, longitude: -82.36 }, gallery_urls: [], updated_at: '2026-11-05T00:00:00Z',
    }))
    query.range.mockImplementation((start: number) => {
      Object.assign(query, { data: rows.slice(start, start + 60), count: 61 })
      return query
    })

    const items = await fetchHomeServiceProvidersForMap({ province: 'La Habana', municipality: 'Playa', category: 'plomeria' })

    expect(items).toHaveLength(61)
    expect(items[0]).toMatchObject({ coordinates: { latitude: 23.11, longitude: -82.36 }, galleryUrls: [] })
    expect(query.range.mock.calls).toEqual([[0, 59], [60, 119]])
    expect(query.eq).toHaveBeenCalledWith('province', 'La Habana')
    expect(query.contains).toHaveBeenCalledWith('municipalities', ['Playa'])
  })
})
