import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { fetchGoogleAnalyticsMetrics, type Env } from './worker'

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
      get: vi.fn(() => ({
        fetch: vi.fn(async () => new Response(JSON.stringify({ allowed: true }))),
      })),
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
  it('reads realtime GA4 active users with service-account credentials', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey))
    let binary = ''
    for (const byte of pkcs8) binary += String.fromCharCode(byte)
    const privateKey = `-----BEGIN PRIVATE KEY-----\n${btoa(binary)}\n-----END PRIVATE KEY-----\n`
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        rows: [{ metricValues: [{ value: '7' }] }],
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchGoogleAnalyticsMetrics({
      ...createEnv(),
      GA_PROPERTY_ID: '544117707',
      GA_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'reader@example.iam.gserviceaccount.com',
        private_key: privateKey,
        token_uri: 'https://oauth2.googleapis.com/token',
      }),
    })

    expect(result).toEqual({ activeUsers: 7, error: '' })
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      'https://analyticsdata.googleapis.com/v1beta/properties/544117707:runRealtimeReport',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer google-access-token' }),
      }),
    )
  })

  it('returns a safe partial error when GA4 credentials are missing', async () => {
    await expect(fetchGoogleAnalyticsMetrics(createEnv())).resolves.toEqual({
      activeUsers: null,
      error: 'Falta configurar Google Analytics.',
    })
  })

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

  it('forwards the authenticated admin metrics RPC and blocks unknown RPCs', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ db_bytes: 42 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const env = createEnv()

    const allowedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/rpc/get_admin_metrics', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token' },
        body: '{}',
      }),
      env,
      createContext(),
    )

    const blockedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/rpc/unknown_function', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token' },
        body: '{}',
      }),
      env,
      createContext(),
    )

    expect(allowedResponse.status).toBe(200)
    expect(blockedResponse.status).toBe(403)
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

  it('marks non-canonical environments as non-indexable', async () => {
    const response = await worker.fetch(
      new Request('https://preview.cubitat.workers.dev/resultados'),
      createEnv(),
      createContext(),
    )

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive, nosnippet')
  })

  it('marks private production routes as non-indexable', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/mi-cuenta/seguridad'),
      createEnv(),
      createContext(),
    )

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive, nosnippet')
  })

  it('keeps canonical public routes indexable', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/resultados'),
      createEnv(),
      createContext(),
    )

    expect(response.headers.get('X-Robots-Tag')).toBeNull()
  })

  it('reapplies noindex headers to cached property HTML on staging', async () => {
    vi.stubGlobal('caches', {
      default: {
        match: vi.fn(async () => new Response('<!doctype html><html></html>', {
          headers: { 'Content-Type': 'text/html' },
        })),
        put: vi.fn(),
      },
    })

    const response = await worker.fetch(
      new Request('https://preview.cubitat.workers.dev/propiedad/casa-00000000-0000-0000-0000-000000000001'),
      createEnv(),
      createContext(),
    )

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive, nosnippet')
  })
})
