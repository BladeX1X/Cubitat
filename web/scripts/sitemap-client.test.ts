import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSitemapClient } from './sitemap-client.mjs'

describe('sitemap Supabase client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the production site origin for a publishable key restricted by origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const client = createSitemapClient(
      'https://project.supabase.co',
      'sb_publishable_test',
      'https://cubitathome.com',
    )
    const { error } = await client.from('properties').select('id')

    expect(error).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('origin')).toBe('https://cubitathome.com')
  })
})
