import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogEvent } from './types'
import { useAuditLog } from './useAuditLog'

const { fetchAuditLogMock } = vi.hoisted(() => ({ fetchAuditLogMock: vi.fn() }))

vi.mock('./auditLogRepository', () => ({ fetchAuditLog: fetchAuditLogMock }))

const baseEvent: AuditLogEvent = {
  id: 'audit-current',
  propertyId: 'property-1',
  propertyOwnerId: 'owner-1',
  propertyTitle: 'Casa actual',
  actorId: 'admin-1',
  actorRole: 'authenticated',
  action: 'update',
  source: 'admin',
  provider: null,
  oldStatus: 'pending_review',
  newStatus: 'published',
  oldModerationMessage: null,
  newModerationMessage: null,
  changedFields: ['status'],
  createdAt: '2026-07-14T12:00:00.000Z',
}

function deferredResult() {
  let resolvePromise: (result: { events: AuditLogEvent[]; total: number }) => void = () => undefined
  const promise = new Promise<{ events: AuditLogEvent[]; total: number }>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: resolvePromise }
}

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAuditLogMock.mockResolvedValue({ events: [baseEvent], total: 1 })
  })

  it('loads the first stable page and resets to page zero after a server filter changes', async () => {
    const { result } = renderHook(() => useAuditLog())

    await waitFor(() => expect(fetchAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      page: 0,
      action: 'all',
      source: 'all',
    })))

    await act(async () => {
      await result.current.load(1)
    })
    expect(fetchAuditLogMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
    expect(result.current.page).toBe(1)

    act(() => result.current.setAction('delete'))
    await waitFor(() => expect(fetchAuditLogMock).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 0,
      action: 'delete',
    })))
    await waitFor(() => expect(result.current.page).toBe(0))
  })

  it('ignores an obsolete response when a newer filtered request finishes first', async () => {
    const stale = deferredResult()
    fetchAuditLogMock.mockReturnValueOnce(stale.promise)
    const { result } = renderHook(() => useAuditLog())
    await waitFor(() => expect(fetchAuditLogMock).toHaveBeenCalledTimes(1))

    const currentEvent: AuditLogEvent = {
      ...baseEvent,
      id: 'audit-new',
      propertyTitle: 'Casa filtrada',
      action: 'delete',
    }
    fetchAuditLogMock.mockResolvedValueOnce({ events: [currentEvent], total: 1 })
    act(() => result.current.setAction('delete'))
    await waitFor(() => expect(result.current.events).toEqual([currentEvent]))

    stale.resolve({ events: [{ ...baseEvent, id: 'audit-old' }], total: 1 })
    await act(async () => {
      await stale.promise
    })
    expect(result.current.events).toEqual([currentEvent])
  })
})
