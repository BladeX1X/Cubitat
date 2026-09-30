import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdvertiserContext } from './advertiserContextRepository'
import { useAdvertiserContext } from './useAdvertiserContext'

vi.mock('./advertiserContextRepository', () => ({
  fetchAdvertiserContext: vi.fn(),
}))

const context = {
  profileCreatedAt: '2026-09-01T00:00:00.000Z',
  accountAgeDays: 26,
  lastPropertyAt: '2026-09-20T00:00:00.000Z',
  propertyCounts: { total: 2, published: 1, pendingReview: 1, aiApproved: 0, aiRejected: 0, paused: 0 },
  reportCounts: { total: 0, pending: 0 },
  riskLevel: 'medium' as const,
  signals: [],
}

describe('useAdvertiserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAdvertiserContext).mockResolvedValue(context)
  })

  it('loads the read-only advertiser context and clears the loading state', async () => {
    const { result } = renderHook(() => useAdvertiserContext('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchAdvertiserContext).toHaveBeenCalledWith('user-1')
    expect(result.current.context).toEqual(context)
    expect(result.current.error).toBeNull()
  })

  it('clears stale context and exposes an error when loading fails', async () => {
    vi.mocked(fetchAdvertiserContext).mockRejectedValue(new Error('private backend details'))
    const { result } = renderHook(() => useAdvertiserContext('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.context).toBeNull()
    expect(result.current.error).toBeTruthy()
    expect(result.current.error).not.toContain('private backend details')
  })

  it('supports a retry after the first request fails', async () => {
    vi.mocked(fetchAdvertiserContext)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(context)
    const { result } = renderHook(() => useAdvertiserContext('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.load()
    })

    expect(fetchAdvertiserContext).toHaveBeenCalledTimes(2)
    expect(result.current.context).toEqual(context)
    expect(result.current.error).toBeNull()
  })
})
