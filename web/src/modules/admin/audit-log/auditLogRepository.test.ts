import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAuditLog } from './auditLogRepository'

const { fromMock, selectMock, orderMock, eqMock, ilikeMock, rangeMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  orderMock: vi.fn(),
  eqMock: vi.fn(),
  ilikeMock: vi.fn(),
  rangeMock: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}))

describe('fetchAuditLog', () => {
  beforeEach(() => {
    const query = {
      select: selectMock,
      order: orderMock,
      eq: eqMock,
      ilike: ilikeMock,
      range: rangeMock,
    }
    fromMock.mockReset().mockReturnValue(query)
    selectMock.mockReset().mockReturnValue(query)
    orderMock.mockReset().mockReturnValue(query)
    eqMock.mockReset().mockReturnValue(query)
    ilikeMock.mockReset().mockReturnValue(query)
    rangeMock.mockReset().mockResolvedValue({ data: [], count: 0, error: null })
  })

  it('applies server filters before a deterministic page range', async () => {
    await fetchAuditLog({
      page: 1,
      pageSize: 15,
      action: 'update',
      source: 'admin',
      query: 'Casa Vedado',
    })

    expect(fromMock).toHaveBeenCalledWith('property_moderation_audit')
    expect(eqMock).toHaveBeenCalledWith('action', 'update')
    expect(eqMock).toHaveBeenCalledWith('source', 'admin')
    expect(ilikeMock).toHaveBeenCalledWith('property_title', '%Casa Vedado%')
    expect(orderMock).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false })
    expect(orderMock).toHaveBeenNthCalledWith(2, 'id', { ascending: false })
    expect(rangeMock).toHaveBeenCalledWith(15, 29)
  })
})
