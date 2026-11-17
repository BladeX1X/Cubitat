import { beforeEach, describe, expect, it, vi } from 'vitest'

const { maybeSingle, eqUserId, eqPropertyId, select, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eqUserId = vi.fn(() => ({ maybeSingle }))
  const eqPropertyId = vi.fn(() => ({ eq: eqUserId }))
  const select = vi.fn(() => ({ eq: eqPropertyId }))
  const from = vi.fn(() => ({ select }))
  return { maybeSingle, eqUserId, eqPropertyId, select, from }
})

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { from },
}))

import { getEditableProperty } from './editablePropertyRepository'

describe('getEditableProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('limita la lectura al id de la propiedad y al usuario propietario', async () => {
    await getEditableProperty('property-123', 'owner-456')

    expect(from).toHaveBeenCalledWith('properties')
    expect(select).toHaveBeenCalledWith('id,title,location,description,zone_id,operation,property_type,price_usd,price_currency,bedrooms,bathrooms,parking,area_m2,age_years,amenities,badge,status,cover_tone,cover_image,images,coordinates,features,user_id,moderation_message,view_count,created_at,updated_at,property_private_addresses(location),property_private_coordinates(coordinates),property_contact_details(name,phone,email)')
    expect(eqPropertyId).toHaveBeenCalledWith('id', 'property-123')
    expect(eqUserId).toHaveBeenCalledWith('user_id', 'owner-456')
    expect(maybeSingle).toHaveBeenCalledOnce()
  })

  it('restores the complete private address only in the owner editing query', async () => {
    maybeSingle.mockResolvedValue({ data: {
      location: 'Playa, La Habana',
      property_private_addresses: { location: 'Calle 999, número 42, Playa, La Habana' },
    }, error: null })
    const result = await getEditableProperty('property-123', 'owner-456')
    expect(result.data?.location).toBe('Calle 999, número 42, Playa, La Habana')
  })

  it('restores exact coordinates only in the owner editing query', async () => {
    maybeSingle.mockResolvedValue({ data: {
      coordinates: { latitude: 23.12, longitude: -82.36 },
      property_private_coordinates: { coordinates: { latitude: 23.1136, longitude: -82.3666 } },
    }, error: null })

    const result = await getEditableProperty('property-123', 'owner-456')

    expect(result.data?.coordinates).toEqual({ latitude: 23.1136, longitude: -82.3666 })
  })

  it('restores private owner contact details from the RLS-protected relation', async () => {
    maybeSingle.mockResolvedValue({ data: {
      property_contact_details: { name: 'Ana Gómez', phone: '+5355512345', email: 'ana@example.test' },
    }, error: null })

    const result = await getEditableProperty('property-123', 'owner-456')

    expect(result.data?.contact_info).toEqual({
      name: 'Ana Gómez',
      phone: '+5355512345',
      email: 'ana@example.test',
    })
  })
})
