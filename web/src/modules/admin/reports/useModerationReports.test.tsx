import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useModerationReports } from './useModerationReports'

const { fetchMock, resolveMock, dismissMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  resolveMock: vi.fn(),
  dismissMock: vi.fn(),
}))

vi.mock('./reportsRepository', () => ({
  fetchModerationReports: fetchMock,
  resolveReport: resolveMock,
  dismissReport: dismissMock,
}))

const report = { id: 'report-1', property_id: 'property-1', status: 'pending' } as never

describe('useModerationReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockResolvedValue({ reports: [report], total: 1 })
    resolveMock.mockResolvedValue(undefined)
    dismissMock.mockResolvedValue(undefined)
  })

  it('loads reports and tracks the requested page', async () => {
    const { result } = renderHook(() => useModerationReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => result.current.load(1))

    expect(fetchMock).toHaveBeenLastCalledWith(1)
    expect(result.current.page).toBe(1)
    expect(result.current.total).toBe(1)
  })

  it('uses a safe error when loading reports fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('sensitive backend detail'))
    const { result } = renderHook(() => useModerationReports())

    await waitFor(() => expect(result.current.error).toBe('No se pudieron cargar los reportes.'))
    expect(result.current.loading).toBe(false)
  })

  it('updates report status after resolving or dismissing', async () => {
    const { result } = renderHook(() => useModerationReports())
    await waitFor(() => expect(result.current.reports).toHaveLength(1))

    await act(async () => result.current.resolve('report-1', 'property-1'))
    expect(result.current.reports[0]).toMatchObject({ id: 'report-1', status: 'resolved' })

    await act(async () => result.current.dismiss('report-1'))
    expect(result.current.reports[0]).toMatchObject({ id: 'report-1', status: 'dismissed' })
    expect(result.current.actionLoading).toBeNull()
  })

  it('shows a notice and clears action state when a moderation action fails', async () => {
    resolveMock.mockRejectedValueOnce(new Error('sensitive backend detail'))
    const { result } = renderHook(() => useModerationReports())
    await waitFor(() => expect(result.current.reports).toHaveLength(1))

    await act(async () => result.current.resolve('report-1', 'property-1'))

    expect(result.current.notice).toBe('No se pudo resolver el reporte.')
    expect(result.current.actionLoading).toBeNull()
    act(() => result.current.clearNotice())
    expect(result.current.notice).toBeNull()
  })
})
