import { describe, expect, it, vi } from 'vitest'
import { submitKycRequest, fetchUserKycStatus } from './kycRepository'
import { supabase } from '../../shared/lib/supabaseClient'

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

describe('kycRepository', () => {
  it('submits KYC request successfully via RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: 'req-uuid-123',
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any)

    const result = await submitKycRequest(
      'identity_card',
      'user-123/document-private.jpg',
      'user-123/selfie-private.jpg',
    )
    expect(result.success).toBe(true)
    expect(result.requestId).toBe('req-uuid-123')
    expect(supabase.rpc).toHaveBeenCalledWith('submit_kyc_request', {
      p_document_type: 'identity_card',
      p_document_path: 'user-123/document-private.jpg',
      p_selfie_path: 'user-123/selfie-private.jpg',
    })
  })

  it('handles error when submitKycRequest RPC fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error', code: '500', details: '', hint: '' },
      count: null,
      status: 500,
      statusText: 'Error',
    } as any)

    const result = await submitKycRequest(
      'passport',
      'user-123/document-private.jpg',
      'user-123/selfie-private.jpg',
    )
    expect(result.success).toBe(false)
    expect(result.error).toBe('No se pudo enviar la solicitud de verificación.')
  })

  it('fetches user KYC status correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: { verification_status: 'verified', verification_reason: null },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    const statusObj = await fetchUserKycStatus('user-123')
    expect(statusObj.status).toBe('verified')
  })
})
