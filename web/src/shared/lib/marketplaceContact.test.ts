import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMarketplaceContact, getMarketplaceContactUrl } from './marketplaceContact'

afterEach(() => vi.unstubAllGlobals())

describe('fetchMarketplaceContact', () => {
  it('posts only the selected listing without caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ phone: '+5351234567', whatsapp: null }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchMarketplaceContact('service', 'listing-id')).resolves.toEqual({ phone: '+5351234567', whatsapp: null })
    expect(fetchMock).toHaveBeenCalledWith('/api/public/marketplace-contact', expect.objectContaining({ method: 'POST', cache: 'no-store' }))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ listing_type: 'service', listing_id: 'listing-id' })
  })

  it('requests property contact from the protected property endpoint only on click', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ phone: '+5351234567', whatsapp: '+5351234567' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchMarketplaceContact('property', '11111111-1111-4111-8111-111111111111')).resolves.toEqual({ phone: '+5351234567', whatsapp: '+5351234567' })
    expect(fetchMock).toHaveBeenCalledWith('/api/public/property-contact', expect.objectContaining({ method: 'POST', cache: 'no-store' }))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ property_id: '11111111-1111-4111-8111-111111111111' })
  })

  it('rejects an invalid contact payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ phone: 'javascript:alert(1)', whatsapp: null }), { status: 200 })))
    await expect(fetchMarketplaceContact('material', 'listing-id')).rejects.toThrow('MARKETPLACE_CONTACT_FAILED')
  })

  it('identifies a listing without public contact details separately from service failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'No hay contacto' }), { status: 404 })))
    await expect(fetchMarketplaceContact('service', 'listing-id')).rejects.toMatchObject({ reason: 'missing' })
  })

  it('builds a phone link and contextual WhatsApp link like property cards', () => {
    expect(getMarketplaceContactUrl('phone', '+53 5123-4567', 'Pintura', 'Camagüey')).toBe('tel:+5351234567')
    expect(getMarketplaceContactUrl('whatsapp', '+53 5123-4567', 'Pintura', 'Camagüey')).toContain('https://wa.me/5351234567?text=')
    expect(getMarketplaceContactUrl('phone', 'bad', 'Pintura', 'Camagüey')).toBeNull()
  })
})
