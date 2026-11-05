import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMarketplaceContact } from './marketplaceContact'

afterEach(() => vi.unstubAllGlobals())

describe('fetchMarketplaceContact', () => {
  it('posts only the selected listing and Turnstile token without caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ phone: '+5351234567', whatsapp: null }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchMarketplaceContact('service', 'listing-id', 'token')).resolves.toEqual({ phone: '+5351234567', whatsapp: null })
    expect(fetchMock).toHaveBeenCalledWith('/api/public/marketplace-contact', expect.objectContaining({ method: 'POST', cache: 'no-store' }))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ listing_type: 'service', listing_id: 'listing-id', turnstile_token: 'token' })
  })

  it('rejects an invalid contact payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ phone: 'javascript:alert(1)', whatsapp: null }), { status: 200 })))
    await expect(fetchMarketplaceContact('material', 'listing-id', 'token')).rejects.toThrow('MARKETPLACE_CONTACT_FAILED')
  })
})
