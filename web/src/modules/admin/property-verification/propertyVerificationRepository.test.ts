import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPendingPropertyVerifications, reviewPropertyVerification } from './propertyVerificationRepository'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  storageFrom: vi.fn(),
  createSignedUrl: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
    rpc: mocks.rpc,
  },
}))

describe('propertyVerificationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = { select: mocks.select, eq: mocks.eq, order: mocks.order }
    mocks.from.mockReturnValue(chain)
    mocks.select.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.order.mockResolvedValue({
      data: [{
        id: 'request-1', property_id: 'property-1', owner_id: 'owner-1',
        document_type: 'ownership_title', document_path: 'owner-1/property-property-1/title.pdf',
        notes: null, status: 'pending', created_at: '2026-09-27T10:00:00Z',
        properties: { title: 'Casa QA', location: 'Holguín' },
      }],
      error: null,
    })
    mocks.storageFrom.mockReturnValue({ createSignedUrl: mocks.createSignedUrl })
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/title' }, error: null })
    mocks.rpc.mockResolvedValue({ data: [{
      score: 70, identity_verified: true, document_verified: false,
      published: true, contact_present: true,
      internal_indicator: 'internal_indicator_not_legal_certification',
    }], error: null })
  })

  it('loads private URL and internal trust score independently for pending requests', async () => {
    const result = await fetchPendingPropertyVerifications()

    expect(result[0].signed_url).toBe('https://signed.example/title')
    expect(result[0].trust_score?.score).toBe(70)
    expect(mocks.rpc).toHaveBeenCalledWith('get_property_trust_score', { p_property_id: 'property-1' })
  })

  it('keeps document review available when the trust score RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('score unavailable') })

    const result = await fetchPendingPropertyVerifications()

    expect(result[0].signed_url).toBe('https://signed.example/title')
    expect(result[0].trust_score).toBeNull()
  })

  it('accepts an object-shaped trust score response', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        score: 85,
        identity_verified: true,
        document_verified: true,
        published: true,
        contact_present: true,
        internal_indicator: 'internal_indicator_not_legal_certification',
      },
      error: null,
    })

    const result = await fetchPendingPropertyVerifications()

    expect(result[0].trust_score?.score).toBe(85)
    expect(result[0].trust_score?.document_verified).toBe(true)
  })

  it('keeps review available when the private document URL cannot be signed', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: new Error('storage unavailable') })

    const result = await fetchPendingPropertyVerifications()

    expect(result[0].signed_url).toBeNull()
    expect(result[0].trust_score?.score).toBe(70)
  })

  it('calls the AAL2 review RPC with the rejection reason', async () => {
    await reviewPropertyVerification('request-1', 'rejected', 'Documento ilegible')

    expect(mocks.rpc).toHaveBeenCalledWith('review_property_verification', {
      p_request_id: 'request-1', p_status: 'rejected', p_reason: 'Documento ilegible',
    })
  })
})
