import { describe, expect, it, vi } from 'vitest'
import { readPublicSitemapProperties } from '../../../scripts/sitemap-data.mjs'

describe('readPublicSitemapProperties', () => {
  it('reads only the public fields of published properties through the site proxy', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'property-1', status: 'published' }],
    })

    await expect(readPublicSitemapProperties({
      siteUrl: 'https://cubitathome.com',
      fetchImpl,
    })).resolves.toEqual([{ id: 'property-1', status: 'published' }])

    const [url, init] = fetchImpl.mock.calls[0]
    const requestUrl = new URL(url)
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://cubitathome.com/api/supabase/rest/v1/properties')
    expect(requestUrl.searchParams.get('select')).toBe('id,location,operation,property_type,status,updated_at')
    expect(requestUrl.searchParams.get('status')).toBe('eq.published')
    expect(init.method).toBe('GET')
    expect(init.headers).not.toHaveProperty('apikey')
  })

  it('fails closed when the public proxy rejects the request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' })

    await expect(readPublicSitemapProperties({
      siteUrl: 'https://cubitathome.com',
      fetchImpl,
    })).rejects.toThrow('Public sitemap inventory request failed (503)')
  })

  it('rejects an unexpected non-array response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })

    await expect(readPublicSitemapProperties({
      siteUrl: 'https://cubitathome.com',
      fetchImpl,
    })).rejects.toThrow('Public sitemap inventory response must be an array')
  })
})
