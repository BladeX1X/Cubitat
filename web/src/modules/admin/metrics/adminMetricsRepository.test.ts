import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchDatabaseMetrics,
  fetchExternalAdminMetrics,
} from './adminMetricsRepository'

const { getSessionMock, rpcMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  rpcMock: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: getSessionMock },
    rpc: rpcMock,
  },
}))

describe('adminMetricsRepository', () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    rpcMock.mockReset()
  })

  it('rejects external metrics without an administrative session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null })

    await expect(fetchExternalAdminMetrics()).rejects.toThrow('No hay una sesión administrativa vigente.')
  })

  it('maps an authorized metrics response to the stable contract', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
      error: null,
    })
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      cloudflare: { requests: 12 },
      analytics: { activeUsers: 4 },
      supabase: { storage_bytes: 10, egress_bytes: null },
    }), { status: 200 }))

    await expect(fetchExternalAdminMetrics(fetcher)).resolves.toEqual({
      cloudflare: { requests: 12, error: null },
      analytics: { activeUsers: 4, error: null },
      supabase: { storage_bytes: 10, egress_bytes: null, db_bytes: null, error: null },
    })
    expect(fetcher).toHaveBeenCalledWith('/api/metrics', {
      headers: { Authorization: 'Bearer token-1' },
    })
  })

  it.each([
    [401, 'La sesión administrativa expiró. Inicia sesión nuevamente.'],
    [403, 'La cuenta actual no tiene permisos para consultar métricas.'],
    [503, 'El servicio de métricas no está disponible temporalmente.'],
  ])('classifies external response status %s safely', async (status, message) => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
      error: null,
    })

    await expect(fetchExternalAdminMetrics(vi.fn().mockResolvedValue(new Response(null, { status }))))
      .rejects.toThrow(message)
  })

  it('loads database metrics through the administrative RPC', async () => {
    const metrics = { db_bytes: 100, storage_bytes: 20, properties_count: 3, users_count: 4, reports_count: 1 }
    rpcMock.mockResolvedValue({ data: metrics, error: null })

    await expect(fetchDatabaseMetrics()).resolves.toEqual(metrics)
    expect(rpcMock).toHaveBeenCalledWith('get_admin_metrics')
  })

  it('propagates database metric failures', async () => {
    const error = new Error('rpc unavailable')
    rpcMock.mockResolvedValue({ data: null, error })

    await expect(fetchDatabaseMetrics()).rejects.toBe(error)
  })
})
