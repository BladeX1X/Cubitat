import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  handlePublicContactSubmission,
  handlePublicReportSubmission,
  type PublicSubmissionEnv,
} from './public-submissions'

const propertyId = '11111111-1111-4111-8111-111111111111'

function createEnv(): PublicSubmissionEnv {
  return {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
    TURNSTILE_VERIFY_URL: 'https://turnstile.example.test',
  }
}

function contactRequest(overrides: Record<string, unknown> = {}) {
  return new Request('https://cubitathome.com/api/public/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' },
    body: JSON.stringify({
      turnstile_token: 'valid-token',
      property_id: propertyId,
      contact_name: 'Ana Perez',
      contact_phone: '+53 51234567',
      message: 'Quiero mas informacion.',
      ...overrides,
    }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('public submission handlers', () => {
  it('rejects an oversized streamed contact body before Turnstile or RPC calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await handlePublicContactSubmission(
      new Request('https://cubitathome.com/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'x'.repeat(16 * 1024) }),
      }),
      createEnv(),
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({ error: 'Solicitud demasiado grande.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects malformed contact payloads before calling Turnstile', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicContactSubmission(
      new Request('https://cubitathome.com/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: 'invalid' }),
      }),
      createEnv(),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Los datos del formulario no son validos.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a client error for an invalid Turnstile result without calling the RPC', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      action: 'contact-owner',
      hostname: 'cubitathome.com',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicContactSubmission(contactRequest(), createEnv())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'La verificacion de seguridad no es valida.' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('returns a service-unavailable error when Turnstile cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })))

    const response = await handlePublicContactSubmission(contactRequest(), createEnv())

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'La verificacion de seguridad no esta disponible.' })
  })

  it('normalizes the contact phone before sending the trusted RPC', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        action: 'contact-owner',
        hostname: 'cubitathome.com',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicContactSubmission(
      contactRequest({ contact_phone: '+53 5123-4567' }),
      createEnv(),
    )

    expect(response.status).toBe(201)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      p_property_id: propertyId,
      p_contact_phone: '+5351234567',
    })
  })

  it('returns a safe error when the trusted contact RPC fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        action: 'contact-owner',
        hostname: 'cubitathome.com',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('database unavailable', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicContactSubmission(contactRequest(), createEnv())

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'No fue posible registrar la consulta.' })
  })

  it('requires an authenticated reporter only at the Worker boundary, not in the trusted payload builder', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        action: 'report-property',
        hostname: 'cubitathome.com',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicReportSubmission(
      new Request('https://cubitathome.com/api/public/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnstile_token: 'valid-token',
          property_id: propertyId,
          reason: 'spam',
          description: 'Contenido sospechoso.',
        }),
      }),
      createEnv(),
      null,
    )

    expect(response.status).toBe(201)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      p_reporter_id: null,
    })
  })
})
