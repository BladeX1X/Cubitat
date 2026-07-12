import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from './worker'

function createEnv(assetResponse = new Response('<!doctype html><html></html>', {
  headers: { 'Content-Type': 'text/html' },
})): Env {
  return {
    ASSETS: {
      fetch: vi.fn(async () => assetResponse.clone()),
    },
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    RATE_LIMITER: {
      idFromName: vi.fn(),
      get: vi.fn(),
    },
  }
}

function createContext() {
  return {
    waitUntil: vi.fn(),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Cloudflare Worker security contract', () => {
  it('redirects HTTP traffic to the canonical HTTPS origin', async () => {
    const response = await worker.fetch(
      new Request('http://cubitathome.com/resultados', {
        headers: { 'x-forwarded-proto': 'http' },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('https://cubitathome.com/resultados')
  })

  it('redirects www to the canonical root domain', async () => {
    const response = await worker.fetch(
      new Request('https://www.cubitathome.com/propiedad/demo'),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('https://cubitathome.com/propiedad/demo')
  })

  it('rejects malformed moderation payloads before authentication', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/ai-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json',
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON' })
  })

  it.each([
    ['POST', '/api/ai-moderate', JSON.stringify({ property_id: crypto.randomUUID() })],
    ['GET', '/api/metrics', undefined],
  ])('returns 401 for anonymous %s requests to %s', async (method, path, body) => {
    const response = await worker.fetch(
      new Request(`https://cubitathome.com${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when an authenticated non-admin requests metrics', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'user' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/metrics', {
        headers: { Authorization: 'Bearer user-token' },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('adds browser security headers to HTML assets', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/'),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
  })
})
