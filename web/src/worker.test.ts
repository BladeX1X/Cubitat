import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { fetchGoogleAnalyticsMetrics, getSupabaseProxyBodyLimit, type Env } from './worker'

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

function createResendTurnstileVerifier(hostname: string, result: Record<string, unknown> = {}) {
  return {
    fetch: vi.fn(async () => new Response(JSON.stringify({
      success: true,
      action: 'resend-confirmation',
      hostname,
      ...result,
    }), { status: 200 })),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Cloudflare Worker security contract', () => {
  it('counts public property views through the server-only RPC with per-IP limiting', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const env = { ...createEnv(), SUPABASE_SERVICE_ROLE_KEY: 'server-only-key' }
    const propertyId = '11111111-1111-4111-8111-111111111111'

    const response = await worker.fetch(new Request('https://cubitathome.com/api/property-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.10' },
      body: JSON.stringify({ propertyId }),
    }), env, createContext())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(env.RATE_LIMITER.get).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith('https://example.supabase.co/rest/v1/rpc/increment_property_view_count', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        apikey: 'server-only-key',
        Authorization: 'Bearer server-only-key',
      }),
      body: JSON.stringify({ property_id: propertyId }),
    }))
  })

  it('rejects invalid property view requests without calling Supabase', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await worker.fetch(new Request('https://cubitathome.com/api/property-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 'not-a-uuid' }),
    }), createEnv(), createContext())

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rate limits property view requests and requires the server credential', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({
      fetch: vi.fn(async () => new Response(JSON.stringify({ allowed: false, resetAt: Date.now() + 60_000 }))),
    }))
    const request = () => new Request('https://cubitathome.com/api/property-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: '11111111-1111-4111-8111-111111111111' }),
    })

    const limitedResponse = await worker.fetch(request(), env, createContext())
    expect(limitedResponse.status).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()

    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: vi.fn(async () => new Response(JSON.stringify({ allowed: true }))) }))
    const missingKeyResponse = await worker.fetch(request(), env, createContext())
    expect(missingKeyResponse.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts property photo uploads only after authenticating the advertiser', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const image = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: ownerId }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/property-images/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-token', 'Content-Type': 'image/webp' },
        body: image,
      }),
      { ...createEnv(), SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' },
      createContext(),
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ path: expect.stringMatching(new RegExp(`^${ownerId}/[0-9a-f-]+\\.webp$`, 'i')) })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      expect.stringMatching(/^https:\/\/example\.supabase\.co\/storage\/v1\/object\/property_images\//),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer service-role-key', 'x-upsert': 'false' }),
      }),
    )
  })

  it('does not write property photos to Storage when the session is missing or invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/property-images/upload', {
        method: 'POST', headers: { Authorization: 'Bearer expired-token', 'Content-Type': 'image/webp' }, body: 'fake',
      }),
      { ...createEnv(), SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' },
      createContext(),
    )

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('uses configured upload limits for each Storage bucket and caps general proxy requests', () => {
    expect(getSupabaseProxyBodyLimit('/storage/v1/object/public/property_images/id.webp', 'POST')).toBe(5 * 1024 * 1024)
    expect(getSupabaseProxyBodyLimit('/storage/v1/object/avatars/user/avatar.webp', 'PUT')).toBe(1024 * 1024)
    expect(getSupabaseProxyBodyLimit('/storage/v1/object/property_documents/user/file.pdf', 'POST')).toBe(10 * 1024 * 1024)
    expect(getSupabaseProxyBodyLimit('/rest/v1/rpc/increment_property_view_count', 'POST')).toBe(64 * 1024)
  })

  it('authenticates ownership checks without exposing endpoints in a query string', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/push/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://push.example.test/subscription-1' }),
      }),
      { ...createEnv(), SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' },
      createContext(),
    )
    expect(response.status).toBe(401)
  })

  it('exposes the Web Push dispatcher scheduler from the production worker', () => {
    expect('scheduled' in worker).toBe(true)
  })

  it('publishes only the public VAPID key', async () => {
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/push/vapid-public-key'),
      { ...createEnv(), VAPID_PUBLIC_KEY: 'public-vapid-key', VAPID_PRIVATE_KEY: 'private-vapid-key' },
      createContext(),
    )

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ publicKey: 'public-vapid-key' })
    expect(body).not.toContain('private-vapid-key')
  })

  it('routes authenticated subscription writes through the Worker', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/push/subscription', {
        method: 'PUT',
        headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://push.example.test/subscription-1',
          expirationTime: null,
          keys: { p256dh: 'public-key-material', auth: 'auth-secret' },
        }),
      }),
      { ...createEnv(), SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' },
      createContext(),
    )

    expect(response.status).toBe(204)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

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

  it('degrada de forma segura cuando el SEO recibe una propiedad malformada', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([null, 'invalid-row', 42]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/propiedad/casa-00000000-0000-0000-0000-000000000099'),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(404)
    expect(await response.text()).toContain('<!doctype html>')
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

  it('authenticates moderation requests before parsing the body', async () => {
    const request = new Request('https://cubitathome.com/api/ai-moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    })
    const getReader = vi.spyOn(request.body!, 'getReader')
    const response = await worker.fetch(
      request,
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(getReader).not.toHaveBeenCalled()
  })

  it('blocks direct public access to the server-only property view RPC', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/rpc/increment_property_view_count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'x'.repeat(64 * 1024) }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Operación no permitida.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rate limits authenticated AI moderation requests per user', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({
      fetch: vi.fn(async () => new Response(JSON.stringify({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      }))),
    }))

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/ai-moderate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer owner-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ property_id: crypto.randomUUID() }),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    await expect(response.json()).resolves.toEqual({
      error: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
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
        body: JSON.stringify({
          property_id: propertyId,
          images: [
            'data:image/jpeg;base64,one',
            'data:image/jpeg;base64,two',
            'data:image/jpeg;base64,three',
            'data:image/jpeg;base64,four',
          ],
        }),
      }),
      {
        ...createEnv(),
        GROQ_API_KEY: 'groq-key',
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
      },
      context,
    )

    await (context.waitUntil.mock.calls[0]?.[0] as Promise<void>)
    const groqRequest = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))
    expect(groqRequest).toMatchObject({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user' }],
      max_completion_tokens: 512,
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
    })
    expect(groqRequest.messages).toHaveLength(1)
    expect(groqRequest.messages[0].content).toHaveLength(4)
    expect(groqRequest.messages[0].content.at(-1)).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,three' },
    })
    expect(groqRequest).not.toHaveProperty('max_tokens')
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toMatchObject({
      p_status: 'ai_approved',
      p_provider: 'groq',
    })
  })

  it('downloads public property images before sending them to Groq', async () => {
    const propertyId = crypto.randomUUID()
    const imageBytes = Uint8Array.from({ length: 3000 }, (_, index) => index % 251)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(imageBytes, {
        status: 200,
        headers: { 'Content-Type': 'image/webp' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ status: 'ai_approved', reason: 'Imagen válida.' }) } }],
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
        body: JSON.stringify({
          property_id: propertyId,
          images: ['https://example.supabase.co/storage/v1/object/public/property_images/owner-1/photo.webp'],
        }),
      }),
      {
        ...createEnv(),
        GROQ_API_KEY: 'groq-key',
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
      },
      context,
    )

    await (context.waitUntil.mock.calls[0]?.[0] as Promise<void>)
    const groqRequest = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))
    const imagePart = groqRequest.messages[0].content.at(-1)
    expect(imagePart.type).toBe('image_url')
    expect(imagePart.image_url.url).toMatch(/^data:image\/webp;base64,/)
    expect(JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body))).toMatchObject({
      p_status: 'ai_approved',
      p_provider: 'groq',
    })
  })

  it('falls back to manual review when Groq is not configured', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
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
      { ...createEnv(), SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key' },
      context,
    )

    await (context.waitUntil.mock.calls[0]?.[0] as Promise<void>)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      p_status: 'pending_review',
      p_message: 'IA deshabilitada. Pendiente de revisión manual.',
      p_provider: null,
    })
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/rest/v1/rpc/set_property_ai_moderation_trusted')
  })

  it('keeps provider errors private and leaves moderation pending for manual review', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: 'The configured model does not exist.' },
      }), { status: 404 }))
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
      p_status: 'pending_review',
      p_message: 'Servicio de IA no disponible. Pendiente de revisión manual.',
      p_provider: 'groq',
    })
  })

  it('rejects provider states outside the moderation allowlist', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ status: 'published', reason: 'No permitido.' }) } }],
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
      p_status: 'pending_review',
      p_message: 'Respuesta de IA no válida. Pendiente de revisión manual.',
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
    expect(consoleError).toHaveBeenCalledWith({
      event: 'moderation_background_failed',
    })
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
      .mockResolvedValueOnce(new Response('null', { status: 200 }))
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
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('allows an admin at aal1 while the database MFA bypass has not expired', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify('2099-10-20T17:00:00Z'), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/metrics', {
        headers: { Authorization: `Bearer ${testJwt('aal1')}` },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(200)
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://example.supabase.co/rest/v1/rpc/get_admin_mfa_bypass_until')
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
    await expect(response.json()).resolves.toEqual({
      cloudflare: {
        requests: null,
        error: 'Falta configurar CF_API_TOKEN y CF_ACCOUNT_ID',
      },
      supabase: {
        storage_bytes: null,
        egress_bytes: null,
        db_bytes: null,
        error: 'Falta configurar SUPABASE_MANAGEMENT_TOKEN y SUPABASE_PROJECT_ID',
      },
      analytics: {
        activeUsers: null,
        error: 'Falta configurar Google Analytics.',
      },
    })
  })

  it('reports an upstream Cloudflare metrics failure without parsing it as data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('upstream failure', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/metrics', {
        headers: { Authorization: `Bearer ${testJwt('aal2')}` },
      }),
      { ...createEnv(), CF_API_TOKEN: 'cf-token', CF_ACCOUNT_ID: 'cf-account' },
      createContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      cloudflare: {
        requests: null,
        error: 'Excepción CF: Cloudflare metrics HTTP 503',
      },
    })
  })

  it('rate limits external metrics requests per AAL2 administrator', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({
      fetch: vi.fn(async () => new Response(JSON.stringify({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 30_000,
      }))),
    }))

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/metrics', {
        headers: { Authorization: `Bearer ${testJwt('aal2')}` },
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('blocks an aal1 admin from reevaluating another user property', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ user_id: 'owner-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ role: 'admin' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('null', { status: 200 }))
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

  it('forwards only the allowlisted public and authenticated RPCs', async () => {
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

    const bypassStatusResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/rpc/get_admin_mfa_bypass_until', {
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

    const publicProfileResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/rpc/get_public_agent_profile', {
        method: 'POST',
        headers: { Authorization: 'Bearer dummy-key-safe-from-browsers' },
        body: '{}',
      }),
      env,
      createContext(),
    )

    const kycResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/rpc/submit_kyc_request', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-token' },
        body: '{}',
      }),
      env,
      createContext(),
    )

    expect(allowedResponse.status).toBe(200)
    expect(bypassStatusResponse.status).toBe(200)
    expect(publicProfileResponse.status).toBe(403)
    expect(kycResponse.status).toBe(403)
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
    expect(csp).toContain('https://example.supabase.co')
    expect(csp).not.toContain('https://tohjzoncoosvjbjcakdl.supabase.co')
    expect(csp).not.toContain('tohjzoncoosvjbjcakdl')
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

  it('passes Supabase realtime websocket upgrades through without rebuilding status 101 responses', async () => {
    const switchingProtocolsResponse = {
      status: 101,
      statusText: 'Switching Protocols',
      headers: new Headers(),
      body: null,
    } as unknown as Response
    const fetchMock = vi.fn(async () => switchingProtocolsResponse)
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/realtime/v1/websocket?apikey=dummy-key-safe-from-browsers&vsn=2.0.0', {
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': 'test-key',
          'Sec-WebSocket-Version': '13',
        },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(101)
    expect(response).toBe(switchingProtocolsResponse)
  })

  it('allows authenticated users to delete their Supabase storage objects through the proxy', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      new Response('{}', { status: 200 })
    ))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/storage/v1/object/property_images/user-id/photo.webp', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer user-token',
        },
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(200)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://example.supabase.co/storage/v1/object/property_images/user-id/photo.webp')
  })

  it('uses the general request quota for signed Storage URLs, not the upload quota', async () => {
    const limiterFetch = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ allowed: true })))
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: limiterFetch }))
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({ signedURL: '/signed/photo.webp' })))
    vi.stubGlobal('fetch', upstreamFetch)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/storage/v1/object/sign/materials/photo.webp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.21' },
        body: JSON.stringify({ expiresIn: 300 }),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(200)
    const limiterRequest = new URL(String(limiterFetch.mock.calls[0]?.[0]))
    expect(limiterRequest.searchParams.get('key')).toBe('203.0.113.21:general')
    expect(limiterRequest.searchParams.get('limit')).toBe('300')
    expect(limiterRequest.searchParams.get('windowMs')).toBe('60000')
  })

  it('keeps real Storage uploads on the dedicated upload quota', async () => {
    const limiterFetch = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ allowed: true })))
    const env = createEnv()
    env.RATE_LIMITER.get = vi.fn(() => ({ fetch: limiterFetch }))
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/storage/v1/object/materials/user-id/photo.webp', {
        method: 'POST',
        headers: { 'Content-Type': 'image/webp', 'CF-Connecting-IP': '203.0.113.22' },
        body: new Uint8Array([1, 2, 3]),
      }),
      env,
      createContext(),
    )

    expect(response.status).toBe(200)
    const limiterRequest = new URL(String(limiterFetch.mock.calls[0]?.[0]))
    expect(limiterRequest.searchParams.get('key')).toBe('203.0.113.22:storage')
    expect(limiterRequest.searchParams.get('limit')).toBe('40')
    expect(limiterRequest.searchParams.get('windowMs')).toBe('600000')
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

  it('allows safe authenticated profile updates but blocks anonymous or protected profile writes', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response('{}', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const allowedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/profiles?id=eq.user-1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer authenticated-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: '+52 55 1234 5678' }),
      }),
      createEnv(),
      createContext(),
    )
    const blockedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/profiles?id=eq.user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+52 55 1234 5678' }),
      }),
      createEnv(),
      createContext(),
    )
    const protectedFieldResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/profiles?id=eq.user-1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer authenticated-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_verified_at: new Date().toISOString(), role: 'admin' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(allowedResponse.status).toBe(200)
    expect(blockedResponse.status).toBe(403)
    expect(protectedFieldResponse.status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/rest/v1/profiles?id=eq.user-1')
  })

  it('allows only a boolean WhatsApp consent on authenticated profile updates', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const allowedResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/profiles?id=eq.user-1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer authenticated-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_whatsapp_enabled: true }),
      }),
      createEnv(),
      createContext(),
    )
    const invalidResponse = await worker.fetch(
      new Request('https://cubitathome.com/api/supabase/rest/v1/profiles?id=eq.user-1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer authenticated-user-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_whatsapp_enabled: 'true' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(allowedResponse.status).toBe(204)
    expect(invalidResponse.status).toBe(403)
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

  it('uses the configured DEV origin for confirmation resend redirects', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://example.supabase.co/auth/v1/resend')
      expect(JSON.parse(String(init?.body))).toMatchObject({
        gotrue_meta_security: { captcha_token: 'valid-token' },
      })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      { ...createEnv(), PUBLIC_SITE_URL: 'https://cubitat1-phase2-dev.pochiprats18.workers.dev' },
      createContext(),
    )

    expect(response.status).toBe(200)
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      'https://cubitat1-phase2-dev.pochiprats18.workers.dev/auth/callback',
    )
  })

  it('uses the configured DEV sender for already-confirmed accounts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ email_confirmed_at: '2026-09-28T00:00:00Z' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      {
        ...createEnv(),
        TURNSTILE_VERIFY: createResendTurnstileVerifier('cubitat1-phase2-dev.pochiprats18.workers.dev'),
        RESEND_API_KEY: 'resend-test',
        SUPABASE_MANAGEMENT_TOKEN: 'management-test',
        SUPABASE_PROJECT_ID: 'project-test',
        ALERT_EMAIL_FROM: 'Cubitat DEV <onboarding@resend.dev>',
      },
      createContext(),
    )

    expect(response.status).toBe(200)
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toContain(
      'Cubitat DEV <onboarding@resend.dev>',
    )
  })

  it('does not fall back to the production sender in DEV', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ email_confirmed_at: '2026-09-28T00:00:00Z' }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      {
        ...createEnv(),
        TURNSTILE_VERIFY: createResendTurnstileVerifier('cubitat1-phase2-dev.pochiprats18.workers.dev'),
        PHASE2_ENABLED: 'true',
        RESEND_API_KEY: 'resend-test',
        SUPABASE_MANAGEMENT_TOKEN: 'management-test',
        SUPABASE_PROJECT_ID: 'project-test',
      },
      createContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not fall back to the production callback in DEV', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      {
        ...createEnv(),
        PHASE2_ENABLED: 'true',
        TURNSTILE_VERIFY: createResendTurnstileVerifier('cubitat1-phase2-dev.pochiprats18.workers.dev'),
      },
      createContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not reveal Resend delivery failures for a confirmed account', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ email_confirmed_at: '2026-09-28T00:00:00Z' }]), { status: 200 }))
      .mockRejectedValueOnce(new Error('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      {
        ...createEnv(),
        TURNSTILE_VERIFY: createResendTurnstileVerifier('cubitathome.com'),
        RESEND_API_KEY: 'resend-test',
        SUPABASE_MANAGEMENT_TOKEN: 'management-test',
        SUPABASE_PROJECT_ID: 'project-test',
      },
      createContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('requires a Turnstile token before looking up or sending confirmation email', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('validates the resend action and hostname before emailing confirmed accounts', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { email_confirmed_at: '2026-09-28T00:00:00Z' },
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const verifier = createResendTurnstileVerifier('attacker.example')

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'invalid-token' }),
      }),
      {
        ...createEnv(),
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
        TURNSTILE_VERIFY: verifier,
        RESEND_API_KEY: 'resend-test',
      },
      createContext(),
    )

    expect(response.status).toBe(400)
    expect(verifier.fetch).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the response generic when Turnstile is unavailable for a confirmed account', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { email_confirmed_at: '2026-09-28T00:00:00Z' },
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const verifier = { fetch: vi.fn(async () => new Response('unavailable', { status: 503 })) }

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      {
        ...createEnv(),
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
        TURNSTILE_VERIFY: verifier,
        RESEND_API_KEY: 'resend-test',
      },
      createContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(verifier.fetch).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('limits confirmation resends by a one-way email hash without revealing quota state', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const rateLimitRequests: Array<{ key: string; limit: string | null; windowMs: string | null }> = []
    const hits = new Map<string, number>()
    const env = createEnv()
    env.RATE_LIMITER = {
      idFromName: vi.fn(() => 'resend-rate-limit'),
      get: vi.fn(() => ({
        fetch: vi.fn(async (input: string | URL | Request) => {
          const url = new URL(String(input))
          const key = url.searchParams.get('key') || ''
          rateLimitRequests.push({
            key,
            limit: url.searchParams.get('limit'),
            windowMs: url.searchParams.get('windowMs'),
          })
          const count = (hits.get(key) || 0) + 1
          hits.set(key, count)
          const maximum = key.startsWith('email:') ? 3 : 5
          return new Response(JSON.stringify({ allowed: count <= maximum }))
        }),
      })),
    }

    const responses: Response[] = []
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(await worker.fetch(
        new Request('https://cubitathome.com/api/auth/resend-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.50' },
          body: JSON.stringify({ email: 'QA@example.com', turnstileToken: `token-${attempt}` }),
        }),
        env,
        createContext(),
      ))
    }

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200])
    await expect(responses[3]?.json()).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const emailKeys = rateLimitRequests.map(({ key }) => key).filter((key) => key.startsWith('email:'))
    expect(emailKeys).toHaveLength(4)
    expect(emailKeys[0]).toMatch(/^email:[a-f0-9]{64}:resend-confirmation:v1$/)
    expect(emailKeys[0]).not.toContain('qa@example.com')
    expect(new Set(emailKeys).size).toBe(1)
    expect(rateLimitRequests.filter(({ key }) => key.startsWith('203.0.113.50:'))).toHaveLength(4)
    expect(rateLimitRequests.find(({ key }) => key.startsWith('email:'))).toMatchObject({
      limit: '3',
      windowMs: '3600000',
    })
  })

  it('does not let Supabase reject a CAPTCHA token and consume the email quota', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'captcha_failed' }), { status: 400 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const counts = new Map<string, number>()
    const limiterOperations: string[] = []
    const env = createEnv()
    env.RATE_LIMITER = {
      idFromName: vi.fn(() => 'resend-rate-limit'),
      get: vi.fn(() => ({
        fetch: vi.fn(async (input: string | URL | Request) => {
          const url = new URL(String(input))
          const key = url.searchParams.get('key') || ''
          const operation = url.searchParams.get('operation') || 'reserve'
          limiterOperations.push(`${operation}:${key}`)
          if (operation === 'release') {
            counts.set(key, Math.max(0, (counts.get(key) || 0) - 1))
            return new Response(JSON.stringify({ released: true }))
          }
          const count = (counts.get(key) || 0) + 1
          counts.set(key, count)
          return new Response(JSON.stringify({ allowed: count <= 3 }))
        }),
      })),
    }

    const responses: Response[] = []
    for (const token of ['invalid-captcha', 'fresh-captcha']) {
      responses.push(await worker.fetch(
        new Request('https://cubitathome.com/api/auth/resend-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.51' },
          body: JSON.stringify({ email: 'qa@example.com', turnstileToken: token }),
        }),
        env,
        createContext(),
      ))
    }

    expect(responses.map((response) => response.status)).toEqual([400, 200])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const emailOperations = limiterOperations.filter((operation) => operation.includes('email:'))
    expect(emailOperations).toHaveLength(3)
    expect(emailOperations[0]).toMatch(/^reserve:email:[a-f0-9]{64}:resend-confirmation:v1$/)
    expect(emailOperations[1]).toBe(emailOperations[0]?.replace('reserve:', 'release:'))
    expect(emailOperations[2]).toBe(emailOperations[0])
    expect(counts.get(emailOperations[0]?.slice('reserve:'.length) || '')).toBe(1)
  })

  it('returns the same generic success when Supabase Auth cannot send an unconfirmed signup email', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(
      new Request('https://cubitathome.com/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'valid-token' }),
      }),
      createEnv(),
      createContext(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
