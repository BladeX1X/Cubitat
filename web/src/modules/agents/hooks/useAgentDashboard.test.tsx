import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentDashboard, setOwnerPropertyVisibility } from '../agentDashboardRepository'
import { useAgentDashboard } from './useAgentDashboard'

vi.mock('../agentDashboardRepository', () => ({
  loadAgentDashboard: vi.fn(),
  setOwnerPropertyVisibility: vi.fn(),
}))

const property = {
  id: 'property-1',
  title: 'Casa accesible en Vedado',
  location: 'Vedado, La Habana',
  price_usd: 85000,
  cover_image: null,
  status: 'published' as const,
  created_at: '2026-08-04T00:00:00.000Z',
  user_id: 'agent-1',
  view_count: 24,
  phone_clicks_count: 1,
  whatsapp_clicks_count: 2,
}

describe('useAgentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentDashboard).mockResolvedValue({
      role: 'agent',
      isVerifiedAgent: true,
      properties: [property],
      contactMetricsAvailable: true,
    })
    vi.mocked(setOwnerPropertyVisibility).mockResolvedValue('owner_hidden')
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('loads verified status, properties, and derived metrics', async () => {
    const { result } = renderHook(() => useAgentDashboard('agent-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isVerifiedAgent).toBe(true)
    expect(result.current.userRole).toBe('agent')
    expect(result.current.properties).toEqual([property])
    expect(result.current.activePropertiesCount).toBe(1)
    expect(result.current.totalAccumulatedViews).toBe(24)
    expect(result.current.totalContactClicks).toBe(3)
    expect(result.current.filteredProperties).toEqual([property])
  })

  it('updates local state and exposes success after changing visibility', async () => {
    const { result } = renderHook(() => useAgentDashboard('agent-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleVisibility(property)
    })

    expect(setOwnerPropertyVisibility).toHaveBeenCalledWith('property-1', 'agent-1', 'published')
    expect(result.current.properties[0].status).toBe('owner_hidden')
    expect(result.current.actionMessage).toEqual({
      type: 'success',
      text: 'Publicación pausada exitosamente.',
    })
    expect(result.current.updatingId).toBeNull()
  })

  it('preserves the property and exposes a safe error when visibility fails', async () => {
    vi.mocked(setOwnerPropertyVisibility).mockRejectedValue(new Error('private backend details'))
    const { result } = renderHook(() => useAgentDashboard('agent-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleVisibility(property)
    })

    expect(result.current.properties[0].status).toBe('published')
    expect(result.current.actionMessage?.type).toBe('error')
    expect(result.current.actionMessage?.text).toBe(
      'No se pudo cambiar el estado de la publicación. Inténtalo de nuevo.',
    )
    expect(result.current.actionMessage?.text).not.toContain('private backend details')
    expect(result.current.updatingId).toBeNull()
  })

  it('exposes a safe load error and finishes loading', async () => {
    vi.mocked(loadAgentDashboard).mockRejectedValue(new Error('private backend details'))
    const { result } = renderHook(() => useAgentDashboard('agent-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.loadError).toBe(true)
    expect(result.current.properties).toEqual([])
  })

  it('retries loading after a transient profile or dashboard error', async () => {
    vi.mocked(loadAgentDashboard)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ role: 'agent', isVerifiedAgent: true, properties: [property], contactMetricsAvailable: true })
    const { result } = renderHook(() => useAgentDashboard('agent-1'))
    await waitFor(() => expect(result.current.loadError).toBe(true))

    await act(async () => result.current.retry())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.loadError).toBe(false)
    expect(result.current.properties).toEqual([property])
    expect(loadAgentDashboard).toHaveBeenCalledTimes(2)
  })
})
