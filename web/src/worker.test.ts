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

function testJwt(aal: 'aal1' | 'aal2') {
  const payload = btoa(JSON.stringify({ aal })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `header.${payload}.signature`
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

  it('routes public contacts through Turnstile and the trusted RPC', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        hostname: 'cubitathome.com',
        action: 'contact-owner',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.10',
        },
        body: JSON.stringify({
          turnstile_token: 'valid-contact-token',
          property_id: propertyId,
          contact_name: 'Rodolfo QA',
          contact_phone: '+53 50000000',
          message: 'Quiero conocer mas detalles.',
        }),
      }),
      {
        ...createEnv(),
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
        TURNSTILE_VERIFY_URL: 'https://turnstile.example.test',
      },
      createContext(),
    )

    expect(response.status).toBe(201)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      `https://example.supabase.co/rest/v1/rpc/submit_public_contact_trusted`,
      expect.objectContaining({ method: 'POST' }),
    )
    const rpcHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(rpcHeaders.get('apikey')).toBe('server-only-service-role-key')
  })

  it('rejects an invalid report session before validating Turnstile', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid token' }), { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/public/report', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer expired-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turnstile_token: 'unused-token',
          property_id: crypto.randomUUID(),
          reason: 'spam',
        }),
      }),
      {
        ...createEnv(),
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
      },
      createContext(),
    )

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it('applies AI moderation through the trusted RPC with service-role credentials', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const context = createContext()

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/ai-moderate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer owner-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property_id: propertyId }),
      }),
      {
        ...createEnv(),
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
      },
      context,
    )

    expect(response.status).toBe(202)
    const backgroundPromise = context.waitUntil.mock.calls[0]?.[0] as Promise<void>
    await backgroundPromise

    expect(fetchMock).toHaveBeenNthCalledWith(3,
      'https://example.supabase.co/rest/v1/rpc/set_property_ai_moderation_trusted',
      expect.objectContaining({ method: 'POST' }),
    )
    const rpcHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers)
    expect(rpcHeaders.get('apikey')).toBe('server-only-service-role-key')
    expect(rpcHeaders.get('Authorization')).toBe('Bearer server-only-service-role-key')
    expect(rpcHeaders.get('Authorization')).not.toBe('Bearer owner-token')
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      p_provider: null,
    })
  })

  it('marks Groq as provider only after a real Groq moderation attempt', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ status: 'ai_approved', reason: 'Cumple.' }) } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const context = createContext()

    await worker.fetch(
      new Request('https://cubitathome.com/api/ai-moderate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer owner-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property_id: propertyId }),
      }),
      {
        ...createEnv(),
        GROQ_API_KEY: 'groq-key',
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
      },
      context,
    )

    await (context.waitUntil.mock.calls[0]?.[0] as Promise<void>)
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toMatchObject({
      p_status: 'ai_approved',
      p_provider: 'groq',
    })
  })

  it('reports a failed trusted moderation RPC instead of accepting it silently', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('database unavailable', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const context = createContext()

    await worker.fetch(
      new Request('https://cubitathome.com/api/ai-moderate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer owner-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property_id: propertyId }),
      }),
      {
        ...createEnv(),
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
      },
      context,
    )

    await (context.waitUntil.mock.calls[0]?.[0] as Promise<void>)
    expect(consoleError).toHaveBeenCalledWith(
      'Error en moderateBackground:',
      expect.objectContaining({ message: expect.stringContaining('503') }),
    )
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

  it('returns 403 when an admin at aal1 requests metrics', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/metrics', {
        headers: { Authorization: `Bearer ${testJwt('aal1')}` },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('allows an admin at aal2 to request metrics', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/metrics', {
        headers: { Authorization: `Bearer ${testJwt('aal2')}` },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(200)
  })

  it('blocks an aal1 admin from reevaluating another user property', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/ai-moderate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testJwt('aal1')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property_id: propertyId }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
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
    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
    const csp = response.headers.get('Content-Security-Policy') || ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'")
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
  })

  it('forwards only explicitly allowed request headers to Supabase', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      new Response('[]', { status: 200 })
    ))
    vi.stubGlobal('fetch', fetchMock)

    await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/properties?select=id', {
        headers: {
          Authorization: 'Bearer user-token',
          Cookie: 'private-cookie=must-not-leave-origin',
          'X-Untrusted-Header': 'must-not-be-forwarded',
          Prefer: 'return=minimal',
        },
      }),
      createEnv(),
      createContext(),
    )

    const forwardedHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(forwardedHeaders.get('Authorization')).toBe('Bearer user-token')
    expect(forwardedHeaders.get('Prefer')).toBe('return=minimal')
    expect(forwardedHeaders.has('Cookie')).toBe(false)
    expect(forwardedHeaders.has('X-Untrusted-Header')).toBe(false)
  })

  it('blocks password login by IP before forwarding it to Supabase', async () => {
    const limiterFetch = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    })))
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: limiterFetch }))
    const upstreamFetch = vi.fn()
    vi.stubGlobal('fetch', upstreamFetch)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.20',
        },
        body: JSON.stringify({ email: 'qa@example.com', password: 'invalid' }),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(429)
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0)
    await expect(response.json()).resolves.toEqual({
      error: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
    })
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it('blocks distributed password attempts by a hashed normalized email', async () => {
    const limiterFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        allowed: true,
        remaining: 5,
        resetAt: Date.now() + 60_000,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 600_000,
      })))
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: limiterFetch }))
    const upstreamFetch = vi.fn()
    vi.stubGlobal('fetch', upstreamFetch)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.21',
        },
        body: JSON.stringify({ email: '  QA@Example.COM  ', password: 'invalid' }),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(429)
    expect(upstreamFetch).not.toHaveBeenCalled()
    expect(limiterFetch).toHaveBeenCalledTimes(2)
    const emailLimiterUrl = String(limiterFetch.mock.calls[1]?.[0])
    expect(emailLimiterUrl).toContain('email%3A')
    expect(emailLimiterUrl).not.toContain('qa%40example.com')
    expect(emailLimiterUrl).not.toContain('QA%40Example.COM')
  })

  it('applies the tighter recovery limit before sending an email', async () => {
    const limiterFetch = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 600_000,
    })))
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: limiterFetch }))
    const upstreamFetch = vi.fn()
    vi.stubGlobal('fetch', upstreamFetch)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.22',
        },
        body: JSON.stringify({ email: 'qa@example.com' }),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(429)
    expect(upstreamFetch).not.toHaveBeenCalled()
    expect(String(limiterFetch.mock.calls[0]?.[0])).toContain('auth%3Arecover%3Aip%3Av1')
  })

  it('rejects a leaked password during signup before forwarding to Supabase', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input)
      if (target === 'https://api.pwnedpasswords.com/range/32CA9') {
        return new Response('FC1A0F5B6330E3F4C8C1BBECDE9BEDB9573:584516', { status: 200 })
      }
      throw new Error(`Unexpected upstream request: ${target}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', password: 'Password1!' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      code: 'weak_password',
      message: 'Esta contraseña apareció en filtraciones conocidas. Elige una contraseña diferente.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a leaked password during an authenticated password change', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input)
      if (target === 'https://api.pwnedpasswords.com/range/32CA9') {
        return new Response('FC1A0F5B6330E3F4C8C1BBECDE9BEDB9573:584516', { status: 200 })
      }
      throw new Error(`Unexpected upstream request: ${target}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/user', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer authenticated-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'Password1!' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(422)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails open when Pwned Passwords is unavailable and preserves signup availability', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'safe-user' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', password: 'StrongPass!123' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('https://example.supabase.co/auth/v1/signup')
  })

  it('rate limits password exposure checks before calling Pwned Passwords', async () => {
    const limiterFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 600_000,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3_600_000,
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      })))
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: limiterFetch }))
    const upstreamFetch = vi.fn()
    vi.stubGlobal('fetch', upstreamFetch)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.23',
        },
        body: JSON.stringify({ email: 'qa@example.com', password: 'Password1!' }),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(429)
    expect(upstreamFetch).not.toHaveBeenCalled()
    expect(limiterFetch).toHaveBeenCalledTimes(3)
    expect(String(limiterFetch.mock.calls[2]?.[0])).toContain('auth%3Apwned-password%3Av1')
  })

  it('forwards authenticated MFA factor cleanup but blocks anonymous deletion', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const allowedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/factors/factor-1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer authenticated-user-token' },
      }),
      createEnv(),
      createContext(),
    )
    const blockedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/auth/v1/factors/factor-1', {
        method: 'DELETE',
      }),
      createEnv(),
      createContext(),
    )

    expect(allowedResponse.status).toBe(200)
    expect(blockedResponse.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it('emits a query-free canonical link for public HTML routes', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/venta/artemisa?utm_source=search'),
      createEnv(new Response(
        '<!doctype html><html><head><link rel="canonical" href="https://cubitathome.com/" /></head></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )),
      createContext(),
    )

    expect(await response.text()).toContain(
      '<link rel="canonical" href="https://cubitathome.com/venta/artemisa" />',
    )
  })

  it('returns a noindex 404 instead of homepage HTML for an unavailable property', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    const response = await worker.fetch(
      new Request('https://cubitathome.com/propiedad/casa-00000000-0000-0000-0000-000000000099'),
      createEnv(new Response(
        '<!doctype html><html><head><link rel="canonical" href="https://cubitathome.com/" /></head></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )),
      createContext(),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive, nosnippet')
    expect(await response.text()).not.toContain('rel="canonical"')
  })

  it('does not reuse cached property HTML across deployments', async () => {
    const cacheMatch = vi.fn()
    vi.stubGlobal('caches', {
      default: {
        match: cacheMatch,
        put: vi.fn(),
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })))

    const response = await worker.fetch(
      new Request('https://preview.cubitat.workers.dev/propiedad/casa-00000000-0000-0000-0000-000000000001'),
      createEnv(),
      createContext(),
    )

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive, nosnippet')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    expect(cacheMatch).not.toHaveBeenCalled()
  })
})
