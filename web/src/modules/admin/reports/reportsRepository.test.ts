import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissReport,
  fetchModerationReports,
  resolveReport,
} from './reportsRepository'

const { fromMock, selectMock, orderMock, rangeMock, updateMock, eqMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  orderMock: vi.fn(),
  rangeMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  rpcMock: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: fromMock, rpc: rpcMock },
}))

describe('reportsRepository', () => {
  beforeEach(() => {
    const query = {
      select: selectMock,
      order: orderMock,
      range: rangeMock,
      update: updateMock,
      eq: eqMock,
    }
    fromMock.mockReset().mockReturnValue(query)
    selectMock.mockReset().mockReturnValue(query)
    orderMock.mockReset().mockReturnValue(query)
    rangeMock.mockReset().mockResolvedValue({ data: [], count: 0, error: null })
    updateMock.mockReset().mockReturnValue(query)
    eqMock.mockReset().mockResolvedValue({ error: null })
    rpcMock.mockReset().mockResolvedValue({ error: null })
  })

  it('loads the requested report page in reverse chronological order', async () => {
    const reports = [{ id: 'report-1', status: 'pending', created_at: '2026-01-01' }]
    rangeMock.mockResolvedValueOnce({ data: reports, count: 11, error: null }).mockResolvedValueOnce({ data: [], count: 3, error: null })

    await expect(fetchModerationReports(2)).resolves.toEqual({ reports: [{ ...reports[0], kind: 'property' }], total: 14 })
    expect(fromMock).toHaveBeenCalledWith('property_reports')
    expect(fromMock).toHaveBeenCalledWith('marketplace_listing_reports')
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(rangeMock).toHaveBeenCalledWith(30, 44)
  })

  it('propagates report loading failures', async () => {
    const error = new Error('database unavailable')
    rangeMock.mockResolvedValue({ data: null, count: null, error })

    await expect(fetchModerationReports(0)).rejects.toBe(error)
  })

  it('resolves a property report atomically through the protected database action', async () => {
    await resolveReport({ kind: 'property', id: 'report-1', property_id: 'property-1' } as never)

    expect(rpcMock).toHaveBeenCalledWith('resolve_property_report', {
      p_report_id: 'report-1',
      p_property_id: 'property-1',
    })
  })

  it('propagates transactional resolution failures', async () => {
    const error = new Error('report resolution failed')
    rpcMock.mockResolvedValueOnce({ error })

    await expect(resolveReport({ kind: 'property', id: 'report-1', property_id: 'property-1' } as never)).rejects.toBe(error)
  })

  it('marks a report as dismissed', async () => {
    await dismissReport({ kind: 'property', id: 'report-1' } as never)

    expect(fromMock).toHaveBeenCalledWith('property_reports')
    expect(updateMock).toHaveBeenCalledWith({ status: 'dismissed' })
    expect(eqMock).toHaveBeenCalledWith('id', 'report-1')
  })
})
