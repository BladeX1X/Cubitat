import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitPublicContact, submitPublicReport } from './publicSubmissions'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('public detail submissions', () => {
  it('sends contact data and the Turnstile token only to the Cubitat endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await submitPublicContact({
      turnstileToken: 'contact-token',
      propertyId: 'property-id',
      contactName: 'Ana Perez',
      contactPhone: '+53 51234567',
      message: 'Quiero mas informacion.',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/public/contact', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).toMatchObject({ turnstile_token: 'contact-token', property_id: 'property-id' })
  })

  it('forwards an authenticated report token without accepting a reporter id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await submitPublicReport({
      turnstileToken: 'report-token',
      propertyId: 'property-id',
      reason: 'FRAUD',
      description: 'Contenido sospechoso.',
      accessToken: 'validated-session-token',
    })

    const options = fetchMock.mock.calls[0]?.[1]
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer validated-session-token')
    expect(String(options?.body)).not.toContain('reporter_id')
  })
})
