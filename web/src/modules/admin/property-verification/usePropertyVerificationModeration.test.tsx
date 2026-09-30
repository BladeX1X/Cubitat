import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendingPropertyVerification } from './propertyVerificationRepository'
import { usePropertyVerificationModeration } from './usePropertyVerificationModeration'

const mocks = vi.hoisted(() => ({
  fetchPendingPropertyVerifications: vi.fn(),
  reviewPropertyVerification: vi.fn(),
}))

vi.mock('./propertyVerificationRepository', () => ({
  fetchPendingPropertyVerifications: mocks.fetchPendingPropertyVerifications,
  reviewPropertyVerification: mocks.reviewPropertyVerification,
}))

const request = {
  id: 'request-1',
  property_id: 'property-1',
  owner_id: 'owner-1',
  document_type: 'ownership_title',
  document_path: 'owner-1/property-property-1/title.pdf',
  notes: null,
  status: 'pending',
  created_at: '2026-09-27T10:00:00Z',
  signed_url: 'https://signed.example/title.pdf',
  trust_score: null,
  properties: { title: 'Casa QA', location: 'Holguín' },
} satisfies PendingPropertyVerification

describe('usePropertyVerificationModeration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchPendingPropertyVerifications.mockResolvedValue([request])
    mocks.reviewPropertyVerification.mockResolvedValue(undefined)
  })

  it('removes an approved request and clears the action state', async () => {
    const { result } = renderHook(() => usePropertyVerificationModeration())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.approve(request)
    })

    expect(mocks.reviewPropertyVerification).toHaveBeenCalledWith('request-1', 'approved')
    expect(result.current.requests).toEqual([])
    expect(result.current.notice).toBe('Verificación documental aprobada.')
    expect(result.current.actionLoadingId).toBeNull()
  })

  it('keeps a request visible and exposes a safe notice when approval fails', async () => {
    mocks.reviewPropertyVerification.mockRejectedValueOnce(new Error('backend failure'))
    const { result } = renderHook(() => usePropertyVerificationModeration())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.approve(request)
    })

    expect(result.current.requests).toEqual([request])
    expect(result.current.notice).toBe('backend failure')
    expect(result.current.actionLoadingId).toBeNull()
  })

  it('requires a rejection reason before calling the review RPC', async () => {
    const { result } = renderHook(() => usePropertyVerificationModeration())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.openReject(request))
    await act(async () => {
      await result.current.confirmReject()
    })
    expect(mocks.reviewPropertyVerification).not.toHaveBeenCalled()

    act(() => result.current.setRejectionReason('Documento ilegible'))
    await act(async () => {
      await result.current.confirmReject()
    })

    expect(mocks.reviewPropertyVerification).toHaveBeenCalledWith('request-1', 'rejected', 'Documento ilegible')
    expect(result.current.requests).toEqual([])
    expect(result.current.notice).toBe('Verificación documental rechazada.')
  })
})
