import { describe, expect, it, vi } from 'vitest'
import { handleContactMetric } from './contact-metrics'

const env = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
  CONTACT_METRICS_SALT: 'a-long-random-test-salt',
}

function request(body: unknown) {
  return new Request('https://phase2.example/api/phase2/contact-click', {
    method: 'POST',
    headers: {
      'cf-connecting-ip': '203.0.113.10',
      'content-type': 'application/json',
      'user-agent': 'Cubitat test browser',
    },
    body: JSON.stringify(body),
  })
}

describe('handleContactMetric', () => {
  it('rejects oversized request bytes before calling the service-role RPC', async () => {
    const fetchFn = vi.fn()
    const response = await handleContactMetric(
      new Request('https://phase2.example/api/phase2/contact-click', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ propertyId: 'x'.repeat(1_024) }),
      }),
      env as never,
      fetchFn,
    )

    expect(response.status).toBe(413)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('derives the viewer key on the server and calls the service-role RPC', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      phone_clicks_count: 2,
      whatsapp_clicks_count: 3,
    }]), { status: 200 }))

    const response = await handleContactMetric(request({
      propertyId: 'f2100000-0000-0000-0000-000000000001',
      channel: 'whatsapp',
      viewerKey: 'client-controlled-value',
    }), env as never, fetchFn, new Date('2026-08-02T12:00:00Z'))

    expect(response.status).toBe(200)
    const options = fetchFn.mock.calls[0][1]
    const rpcBody = JSON.parse(String(options?.body))
    expect(rpcBody).toEqual({
      p_property_id: 'f2100000-0000-0000-0000-000000000001',
      p_channel: 'whatsapp',
      p_viewer_key: expect.stringMatching(/^[0-9a-f-]{36}$/),
    })
    expect(options?.headers).toMatchObject({
      apikey: 'service-role-test',
      Authorization: 'Bearer service-role-test',
    })
  })

  it('fails closed when server-only secrets are missing', async () => {
    const fetchFn = vi.fn()
    const response = await handleContactMetric(request({
      propertyId: 'f2100000-0000-0000-0000-000000000001',
      channel: 'phone',
    }), { VITE_SUPABASE_URL: env.VITE_SUPABASE_URL } as never, fetchFn)

    expect(response.status).toBe(503)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rejects invalid properties and channels before calling Supabase', async () => {
    const fetchFn = vi.fn()
    const response = await handleContactMetric(request({
      propertyId: 'not-a-uuid',
      channel: 'email',
    }), env as never, fetchFn)

    expect(response.status).toBe(400)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
