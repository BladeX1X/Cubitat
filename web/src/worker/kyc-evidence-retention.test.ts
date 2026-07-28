import { describe, expect, it, vi } from 'vitest'
import { purgeApprovedKycEvidence } from './kyc-evidence-retention'

const env = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
}

describe('purgeApprovedKycEvidence', () => {
  it('does not access the network without server-only configuration', async () => {
    const fetchFn = vi.fn()

    await expect(purgeApprovedKycEvidence({
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
    }, fetchFn)).resolves.toEqual({ claimed: 0, purged: 0, failed: 0 })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('deletes both private objects before marking the audit row as purged', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'request-1',
        document_path: 'user-1/document-front.webp',
        selfie_path: 'user-1/selfie-proof.webp',
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(purgeApprovedKycEvidence(env, fetchFn)).resolves.toEqual({
      claimed: 1,
      purged: 1,
      failed: 0,
    })

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://project.supabase.co/rest/v1/rpc/claim_approved_kyc_evidence_for_purge',
    )
    expect(fetchFn.mock.calls[1]?.[0]).toBe(
      'https://project.supabase.co/storage/v1/object/kyc_documents',
    )
    expect(fetchFn.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(JSON.parse(String(fetchFn.mock.calls[1]?.[1]?.body))).toEqual({
      prefixes: ['user-1/document-front.webp', 'user-1/selfie-proof.webp'],
    })
    expect(fetchFn.mock.calls[2]?.[0]).toBe(
      'https://project.supabase.co/rest/v1/rpc/complete_kyc_evidence_purge',
    )
  })

  it('keeps database paths and releases the claim when Storage rejects deletion', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'request-1',
        document_path: 'user-1/document-front.webp',
        selfie_path: 'user-1/selfie-proof.webp',
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('storage unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(purgeApprovedKycEvidence(env, fetchFn)).resolves.toEqual({
      claimed: 1,
      purged: 0,
      failed: 1,
    })
    expect(fetchFn.mock.calls[2]?.[0]).toBe(
      'https://project.supabase.co/rest/v1/rpc/release_kyc_evidence_purge',
    )
    expect(fetchFn.mock.calls.some(([url]) => (
      String(url).includes('complete_kyc_evidence_purge')
    ))).toBe(false)
  })

  it('returns safely when Supabase is unavailable', async () => {
    const fetchFn = vi.fn().mockRejectedValueOnce(new Error('network unavailable'))

    await expect(purgeApprovedKycEvidence(env, fetchFn)).resolves.toEqual({
      claimed: 0,
      purged: 0,
      failed: 0,
    })
  })
})
