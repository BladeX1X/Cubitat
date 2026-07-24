import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  handlePublicContactSubmission,
  handlePublicReportSubmission,
  type PublicSubmissionEnv,
} from './public-submissions'

function createEnv(): PublicSubmissionEnv {
  return {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
    TURNSTILE_VERIFY_URL: 'https://turnstile.example.workers.dev',
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('public submissions protected by Turnstile', () => {
  it('validates Turnstile before inserting a contact through the trusted RPC', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        hostname: 'cubitathome.com',
        action: 'contact-owner',
        'error-codes': [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicContactSubmission(
      new Request('https://cubitathome.com/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' },
        body: JSON.stringify({
          turnstile_token: 'valid-token',
          property_id: propertyId,
          contact_name: 'Ana Perez',
          contact_phone: '+53 51234567',
          message: 'Quiero mas informacion sobre esta propiedad.',
        }),
      }),
      createEnv(),
    )

    expect(response.status).toBe(201)
    expect(fetchMock).toHaveBeenNthCalledWith(1,
      'https://turnstile.example.workers.dev',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      'https://example.supabase.co/rest/v1/rpc/submit_public_contact_trusted',
      expect.objectContaining({ method: 'POST' }),
    )
    const rpcHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(rpcHeaders.get('Authorization')).toBe('Bearer server-only-service-role-key')
  })

  it('rejects a token issued for another action without touching Supabase', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      hostname: 'cubitathome.com',
      action: 'register-user',
      'error-codes': [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handlePublicContactSubmission(
      new Request('https://cubitathome.com/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnstile_token: 'wrong-action-token',
          property_id: crypto.randomUUID(),
          contact_name: 'Ana Perez',
          contact_phone: '+53 51234567',
          message: 'Quiero mas informacion sobre esta propiedad.',
        }),
      }),
      createEnv(),
    )

    expect(response.status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses only the server-validated reporter id for authenticated reports', async () => {
    const propertyId = crypto.randomUUID()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        hostname: 'cubitathome.com',
        action: 'report-property',
        'error-codes': [],
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
          reason: 'FRAUD',
          description: 'La informacion parece fraudulenta.',
          reporter_id: 'attacker-controlled-id',
        }),
      }),
      createEnv(),
      'validated-user-id',
    )

    expect(response.status).toBe(201)
    const rpcBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(rpcBody.p_reporter_id).toBe('validated-user-id')
    expect(JSON.stringify(rpcBody)).not.toContain('attacker-controlled-id')
  })
})
