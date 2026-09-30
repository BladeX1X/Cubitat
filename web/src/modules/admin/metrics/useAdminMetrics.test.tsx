import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminMetrics } from './useAdminMetrics'

const { databaseMock, externalMock } = vi.hoisted(() => ({
  databaseMock: vi.fn(),
  externalMock: vi.fn(),
}))

vi.mock('./adminMetricsRepository', () => ({
  fetchDatabaseMetrics: databaseMock,
  fetchExternalAdminMetrics: externalMock,
}))

const databaseMetrics = {
  db_bytes: 2048,
  storage_bytes: 4096,
  properties_count: 8,
  users_count: 5,
  reports_count: 2,
}

const externalMetrics = {
  cloudflare: { requests: 10, error: null },
  analytics: { activeUsers: 3, error: null },
  supabase: { storage_bytes: null, egress_bytes: null, db_bytes: null, error: null },
}

describe('useAdminMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    databaseMock.mockResolvedValue(databaseMetrics)
    externalMock.mockResolvedValue(externalMetrics)
  })

  it('combines database and external metrics with formatted database size', async () => {
    const { result } = renderHook(() => useAdminMetrics())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual({
      db_size: '0.0 MB',
      properties_count: 8,
      users_count: 5,
      reports_count: 2,
    })
    expect(result.current.metrics?.supabase).toMatchObject({
      db_bytes: 2048,
      storage_bytes: 4096,
      egress_bytes: null,
    })
    expect(result.current.metrics?.supabase.error).toContain('egreso mensual')
  })

  it('keeps database stats when external metrics fail', async () => {
    externalMock.mockRejectedValueOnce(new Error('sensitive provider detail'))
    const { result } = renderHook(() => useAdminMetrics())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats?.properties_count).toBe(8)
    expect(result.current.metrics).toBeNull()
    expect(result.current.externalError).toBe('No se pudieron cargar las métricas externas.')
    expect(result.current.error).toBeNull()
  })

  it('exposes a safe database error and finishes loading', async () => {
    databaseMock.mockRejectedValueOnce(new Error('sensitive database detail'))
    const { result } = renderHook(() => useAdminMetrics())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('No se pudieron cargar las estadísticas.')
    expect(result.current.stats).toBeNull()
    expect(externalMock).not.toHaveBeenCalled()
  })
})
