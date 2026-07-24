import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPendingKycRequests, reviewKycRequest } from './kycAdminRepository'

const { fromMock, selectMock, eqMock, orderMock, rpcMock, storageFromMock, createSignedUrlMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  orderMock: vi.fn(),
  rpcMock: vi.fn(),
  storageFromMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
    storage: { from: storageFromMock },
  },
}))

describe('kycAdminRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const queryChain = {
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    }

    fromMock.mockReturnValue(queryChain)
    selectMock.mockReturnValue(queryChain)
    eqMock.mockReturnValue(queryChain)
    orderMock.mockResolvedValue({ data: [], error: null })
    storageFromMock.mockReturnValue({ createSignedUrl: createSignedUrlMock })
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://signed.example/doc' }, error: null })
  })

  describe('fetchPendingKycRequests', () => {
    it('queries kyc_requests table for pending status and joins profiles data', async () => {
      const mockData = [
        {
          id: 'req-1',
          user_id: 'user-1',
          document_type: 'identity_card',
          document_path: 'user-1/id.jpg',
          selfie_path: 'user-1/selfie.jpg',
          status: 'pending',
          rejection_reason: null,
          created_at: '2026-07-21T10:00:00Z',
          updated_at: '2026-07-21T10:00:00Z',
          profiles: {
            full_name: 'María Delgado',
            email: 'maria@example.com',
          },
        },
      ]

      orderMock.mockResolvedValueOnce({ data: mockData, error: null })
      createSignedUrlMock
        .mockResolvedValueOnce({ data: { signedUrl: 'https://signed.example/document' }, error: null })
        .mockResolvedValueOnce({ data: { signedUrl: 'https://signed.example/selfie' }, error: null })

      const result = await fetchPendingKycRequests()

      expect(fromMock).toHaveBeenCalledWith('kyc_requests')
      expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('profiles'))
      expect(eqMock).toHaveBeenCalledWith('status', 'pending')
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'req-1',
        user_id: 'user-1',
        document_type: 'identity_card',
        document_path: 'user-1/id.jpg',
        selfie_path: 'user-1/selfie.jpg',
        document_signed_url: 'https://signed.example/document',
        selfie_signed_url: 'https://signed.example/selfie',
        status: 'pending',
        rejection_reason: null,
        created_at: '2026-07-21T10:00:00Z',
        updated_at: '2026-07-21T10:00:00Z',
        profiles: {
          full_name: 'María Delgado',
          email: 'maria@example.com',
        },
        full_name: 'María Delgado',
        email: 'maria@example.com',
      })
      expect(createSignedUrlMock).toHaveBeenCalledTimes(2)
    })

    it('throws error when database query fails', async () => {
      const dbError = new Error('Database connection failed')
      orderMock.mockResolvedValueOnce({ data: null, error: dbError })

      await expect(fetchPendingKycRequests()).rejects.toThrow('No se pudieron cargar las solicitudes KYC pendientes.')
    })
  })

  describe('reviewKycRequest', () => {
    it('invokes review_kyc_request RPC with approved status', async () => {
      rpcMock.mockResolvedValueOnce({ data: null, error: null })

      await reviewKycRequest('req-1', 'approved')

      expect(rpcMock).toHaveBeenCalledWith('review_kyc_request', {
        p_request_id: 'req-1',
        p_status: 'approved',
        p_reason: null,
      })
    })

    it('invokes review_kyc_request RPC with rejected status and reason', async () => {
      rpcMock.mockResolvedValueOnce({ data: null, error: null })

      await reviewKycRequest('req-2', 'rejected', 'Documento ilisible')

      expect(rpcMock).toHaveBeenCalledWith('review_kyc_request', {
        p_request_id: 'req-2',
        p_status: 'rejected',
        p_reason: 'Documento ilisible',
      })
    })

    it('throws error when RPC invocation fails', async () => {
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permiso denegado' },
      })

      await expect(reviewKycRequest('req-1', 'approved')).rejects.toThrow()
    })
  })
})
