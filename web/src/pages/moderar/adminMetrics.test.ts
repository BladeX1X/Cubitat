import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { auth: { getSession } },
}))

import { fetchAdminMetrics } from './adminMetrics'

describe('fetchAdminMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({
      data: { session: { access_token: 'test-admin-token' } },
      error: null,
    })
  })

  it('autentica la petición al endpoint interno de métricas', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ cloudflare: {}, analytics: {}, supabase: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await fetchAdminMetrics(fetcher)

    expect(fetcher).toHaveBeenCalledWith('/api/metrics', {
      headers: { Authorization: 'Bearer test-admin-token' },
    })
  })

  it('rechaza la consulta cuando no existe una sesión vigente', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(fetchAdminMetrics(vi.fn())).rejects.toThrow('sesión administrativa')
  })

  it('distingue una respuesta prohibida del endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 403 }))

    await expect(fetchAdminMetrics(fetcher)).rejects.toThrow('permisos')
  })
})
