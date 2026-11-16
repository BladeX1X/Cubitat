import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavedMarketplaceListingsProvider, useSavedMarketplaceListings } from './useSavedMarketplaceListings'

const mocks = vi.hoisted(() => ({
  queryResults: [] as Array<{ data: unknown; error: unknown }>,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  authListener: undefined as ((event: string, session: { user?: { id: string } } | null) => void) | undefined,
  deleteResolvers: [] as Array<(result: { error: unknown }) => void>,
  insertResolvers: [] as Array<(result: { error: unknown }) => void>,
  readResolvers: [] as Array<(result: { data: unknown; error: unknown }) => void>,
  deferNextRead: false,
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => {
          if (mocks.deferNextRead) {
            mocks.deferNextRead = false
            return new Promise((resolve) => { mocks.readResolvers.push(resolve) })
          }
          return Promise.resolve(mocks.queryResults.shift() ?? { data: [], error: null })
        }),
      })),
      insert: vi.fn(() => new Promise((resolve) => { mocks.insertResolvers.push(resolve) })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => new Promise((resolve) => { mocks.deleteResolvers.push(resolve) })),
        })),
      })),
    })),
  },
}))

vi.mock('../../auth/contexts/AuthModalContext', () => ({
  useAuthModal: () => ({ openSavePrompt: vi.fn() }),
}))

function SavedListingsState() {
  const { savedServiceIds, error, loading, retryLoad, toggleSave } = useSavedMarketplaceListings()
  return (
    <div>
      <p role="status">{loading ? `Cargando:${[...savedServiceIds].join(',')}` : error || [...savedServiceIds].join(',') || 'Lista vacía'}</p>
      <button type="button" onClick={retryLoad}>Reintentar carga</button>
      <button type="button" onClick={() => { void toggleSave('service', 'service-a') }}>Cambiar favorito de servicio</button>
    </div>
  )
}

describe('useSavedMarketplaceListings', () => {
  beforeEach(() => {
    mocks.queryResults = []
    mocks.deleteResolvers = []
    mocks.insertResolvers = []
    mocks.readResolvers = []
    mocks.deferNextRead = false
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: 'qa-user' } } } })
    mocks.onAuthStateChange.mockReset().mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  })

  it('exposes a load failure instead of reporting an empty list and retries successfully', async () => {
    mocks.queryResults.push(
      { data: null, error: { code: '42501' } },
      { data: [{ service_provider_id: 'service-1', material_listing_id: null }], error: null },
    )
    render(
      <SavedMarketplaceListingsProvider>
        <SavedListingsState />
      </SavedMarketplaceListingsProvider>,
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/no se pudieron cargar tus favoritos/i))
    expect(screen.getByRole('status')).not.toHaveTextContent('Lista vacía')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }))
    expect(await screen.findByRole('status')).toHaveTextContent('service-1')
  })

  it('keeps loading until Auth confirms that there is no session', async () => {
    let resolveSession!: (value: { data: { session: null } }) => void
    mocks.getSession.mockReturnValueOnce(new Promise((resolve) => { resolveSession = resolve }))
    render(
      <SavedMarketplaceListingsProvider>
        <SavedListingsState />
      </SavedMarketplaceListingsProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    expect(screen.getByRole('status')).not.toHaveTextContent('Lista vacía')
    await act(async () => { resolveSession({ data: { session: null } }) })
    expect(screen.getByRole('status')).toHaveTextContent('Lista vacía')
  })

  it('does not restore an old account favorite when its pending delete fails after switching accounts', async () => {
    mocks.queryResults.push(
      { data: [{ service_provider_id: 'service-a', material_listing_id: null }], error: null },
      { data: [{ service_provider_id: 'service-b', material_listing_id: null }], error: null },
    )
    render(<SavedMarketplaceListingsProvider><SavedListingsState /></SavedMarketplaceListingsProvider>)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('service-a'))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar favorito de servicio' }))
    await waitFor(() => expect(mocks.deleteResolvers).toHaveLength(1))

    act(() => mocks.authListener?.('SIGNED_IN', { user: { id: 'user-b' } }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('service-b'))
    await act(async () => { mocks.deleteResolvers[0]({ error: { code: '42501' } }) })

    expect(screen.getByRole('status')).toHaveTextContent('service-b')
    expect(screen.getByRole('status')).not.toHaveTextContent('service-a')
  })

  it('reloads a favorites snapshot that finished before an in-flight save', async () => {
    mocks.deferNextRead = true
    mocks.queryResults.push({ data: [{ service_provider_id: 'service-a', material_listing_id: null }], error: null })
    render(<SavedMarketplaceListingsProvider><SavedListingsState /></SavedMarketplaceListingsProvider>)

    await waitFor(() => expect(mocks.readResolvers).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar favorito de servicio' }))
    await waitFor(() => expect(mocks.insertResolvers).toHaveLength(1))
    await act(async () => { mocks.readResolvers[0]({ data: [], error: null }) })
    expect(screen.getByRole('status')).toHaveTextContent('Cargando:service-a')

    await act(async () => { mocks.insertResolvers[0]({ error: null }) })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('service-a'))
    expect(mocks.queryResults).toHaveLength(0)
  })

  it('recovers when the initial session check fails', async () => {
    mocks.getSession.mockReset()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ data: { session: { user: { id: 'qa-user' } } } })
    mocks.queryResults.push({ data: [{ service_provider_id: 'service-a', material_listing_id: null }], error: null })
    render(<SavedMarketplaceListingsProvider><SavedListingsState /></SavedMarketplaceListingsProvider>)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/no se pudo comprobar tu sesión/i))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('service-a'))
  })
})
