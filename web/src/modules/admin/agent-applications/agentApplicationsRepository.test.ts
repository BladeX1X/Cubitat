import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAgentApplicationDocumentLinks, fetchPendingAgentApplications, reviewAgentApplication } from './agentApplicationsRepository'

const query = vi.hoisted(() => ({
  select: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(() => query), auth: { getSession: query.getSession }, rpc: query.rpc },
}))

describe('agentApplicationsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    query.select.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null })
  })

  it('uses an exact count and fetches a bounded page for large review queues', async () => {
    query.range.mockResolvedValue({ data: [{ id: 'application-21' }], count: 306, error: null })

    const result = await fetchPendingAgentApplications(1)

    expect(query.select).toHaveBeenCalledWith(
      'id,user_id,province,education_title,experience_summary,status,created_at',
      { count: 'exact' },
    )
    expect(query.in).toHaveBeenCalledWith('status', ['submitted', 'reviewing', 'waitlisted'])
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(query.range).toHaveBeenCalledWith(20, 39)
    expect(result).toEqual({ items: [{ id: 'application-21' }], total: 306 })
  })

  it('does not turn query errors into an empty queue', async () => {
    query.range.mockResolvedValue({ data: null, count: null, error: new Error('RLS unavailable') })
    await expect(fetchPendingAgentApplications(1)).rejects.toThrow('No se pudieron cargar las postulaciones.')
  })

  it('explains when a fresh admin verification is required for private documents', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'admin_aal2_required' }), { status: 403 })))

    await expect(fetchAgentApplicationDocumentLinks('application-id')).rejects.toThrow(/nueva verificación de seguridad/i)
  })

  it('distinguishes a Storage signing failure from an authorization failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'document_signing_failed' }), { status: 502 })))

    await expect(fetchAgentApplicationDocumentLinks('application-id')).rejects.toThrow(/Storage no pudo generar/i)
  })

  it('explains KYC or status preconditions returned by the review RPC', async () => {
    query.rpc.mockResolvedValueOnce({ data: null, error: { code: '22023' } })

    await expect(reviewAgentApplication('application-id', 'approved')).rejects.toThrow(/KYC/i)
  })

  it('reports when the hosted PostgREST schema has not loaded the review RPC', async () => {
    query.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })

    await expect(reviewAgentApplication('application-id', 'reviewing')).rejects.toThrow(/caché del esquema/i)
  })

  it('identifies transport failures when the SDK error has no SQLSTATE code', async () => {
    query.rpc.mockResolvedValueOnce({ data: null, error: { name: 'TypeError', message: 'Failed to fetch' } })

    await expect(reviewAgentApplication('application-id', 'reviewing')).rejects.toThrow(/conexión con Supabase/i)
  })

  it('shows safe status and field names for an unrecognized error object', async () => {
    query.rpc.mockResolvedValueOnce({ data: null, error: { name: 'SupabaseError', status: 502, message: 'Gateway detail must not be exposed' } })

    await expect(reviewAgentApplication('application-id', 'reviewing')).rejects.toThrow(/HTTP 502/i)
  })
})
