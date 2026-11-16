import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SavedPropertiesProvider, useSavedProperties } from './useSavedProperties'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  authListener: undefined as ((event: string, session: { user: { id: string } } | null) => void) | undefined,
  requests: [] as Array<(value: { data: Array<{ property_id: string }>; error: null }) => void>,
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
  },
}))

vi.mock('../../../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(),
  sanitizeErrorReason: vi.fn(() => 'test_error'),
}))

vi.mock('../../auth/contexts/AuthModalContext', () => ({
  useAuthModal: () => ({ openSavePrompt: vi.fn() }),
}))

function FavoritesState({ allowToggle = false, onToggleResult }: { allowToggle?: boolean; onToggleResult?: (result: boolean) => void }) {
  const { savedPropertyIds, loading, error, retryLoad, toggleSave } = useSavedProperties()
  return (
    <>
      <output>{`${loading ? 'loading' : 'ready'}:${[...savedPropertyIds].join(',')}`}</output>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={retryLoad}>Reintentar carga</button>
      {allowToggle && <button type="button" onClick={() => void toggleSave('property-new').then(onToggleResult)}>Guardar propiedad</button>}
    </>
  )
}

describe('SavedPropertiesProvider session changes', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.requests = []
    mocks.authListener = undefined
  })

  it('clears the previous account favorites while loading a new account', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation(() => ({
      select: () => ({
        eq: (_column: string, userId: string) => new Promise((resolve) => {
            mocks.requests.push(resolve)
            expect(userId).toMatch(/^user-[ab]$/)
          }),
      }),
    }))

    render(
      <SavedPropertiesProvider>
        <FavoritesState />
      </SavedPropertiesProvider>,
    )

    expect(mocks.getSession).toHaveBeenCalled()
    expect(mocks.authListener).toBeTypeOf('function')

    await waitFor(() => expect(mocks.requests).toHaveLength(1))
    await act(async () => {
      mocks.requests[0]({ data: [{ property_id: 'property-a' }], error: null })
    })
    expect(screen.getByRole('status')).toHaveTextContent('ready:property-a')

    act(() => mocks.authListener?.('SIGNED_IN', { user: { id: 'user-b' } }))

    await waitFor(() => expect(mocks.requests).toHaveLength(2))
    expect(screen.getByRole('status')).toHaveTextContent('loading:')
    await act(async () => {
      mocks.requests[1]({ data: [{ property_id: 'property-b' }], error: null })
    })
    expect(screen.getByRole('status')).toHaveTextContent('ready:property-b')
  })

  it('exposes a load error and lets the user retry the query', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementationOnce(() => ({
      select: () => ({ eq: () => Promise.reject(new Error('offline')) }),
    }))
    mocks.from.mockImplementation(() => ({
      select: () => ({
        eq: (_column: string, userId: string) => new Promise((resolve) => {
          mocks.requests.push(resolve)
          expect(userId).toBe('user-a')
        }),
      }),
    }))

    render(
      <SavedPropertiesProvider>
        <FavoritesState />
      </SavedPropertiesProvider>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudieron cargar tus favoritos/i)
    screen.getByRole('button', { name: /reintentar carga/i }).click()
    await waitFor(() => expect(mocks.requests).toHaveLength(1))
    await act(async () => {
      mocks.requests[0]({ data: [{ property_id: 'property-a' }], error: null })
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('ready:property-a')
  })

  it('handles a rejected session lookup and retries it from the recovery action', async () => {
    mocks.getSession
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation(() => ({
      select: () => ({ eq: () => Promise.resolve({ data: [{ property_id: 'property-a' }], error: null }) }),
    }))

    render(<SavedPropertiesProvider><FavoritesState /></SavedPropertiesProvider>)

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo comprobar tu sesión/i)
    fireEvent.click(screen.getByRole('button', { name: /reintentar carga/i }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:property-a'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mocks.getSession).toHaveBeenCalledTimes(2)
  })

  it('does not let a failed favorite mutation from the previous account clear the new account state', async () => {
    let rejectOldInsert!: (result: { error: Error }) => void
    const onToggleResult = vi.fn()
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation(() => ({
      select: () => ({
        eq: (_column: string, userId: string) => new Promise((resolve) => {
          mocks.requests.push(resolve)
          expect(userId).toMatch(/^user-[ab]$/)
        }),
      }),
      insert: () => new Promise((resolve) => { rejectOldInsert = resolve }),
    }))

    render(<SavedPropertiesProvider><FavoritesState allowToggle onToggleResult={onToggleResult} /></SavedPropertiesProvider>)
    await waitFor(() => expect(mocks.requests).toHaveLength(1))
    await act(async () => mocks.requests[0]({ data: [], error: null }))
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))

    act(() => mocks.authListener?.('SIGNED_IN', { user: { id: 'user-b' } }))
    await waitFor(() => expect(mocks.requests).toHaveLength(2))
    await act(async () => mocks.requests[1]({ data: [{ property_id: 'property-b' }], error: null }))
    await act(async () => rejectOldInsert({ error: new Error('old request failed') }))

    expect(screen.getByRole('status')).toHaveTextContent('ready:property-b')
    expect(onToggleResult).toHaveBeenCalledWith(true)
  })

  it('sends only one write when the same favorite is toggled twice before the response', async () => {
    let resolveInsert!: (value: { error: null }) => void
    const insert = vi.fn(() => new Promise((resolve) => { resolveInsert = resolve }))
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation((table: string) => table === 'saved_properties'
      ? {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          insert,
        }
      : {})

    render(<SavedPropertiesProvider><FavoritesState allowToggle /></SavedPropertiesProvider>)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:'))
    const toggle = screen.getByRole('button', { name: /guardar propiedad/i })
    act(() => {
      fireEvent.click(toggle)
      fireEvent.click(toggle)
    })

    expect(insert).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('ready:property-new')
    await act(async () => resolveInsert({ error: null }))
    expect(screen.getByRole('status')).toHaveTextContent('ready:property-new')
  })

  it('reloads a stale favorites query if a toggle completed while it was pending', async () => {
    let resolveInsert!: (value: { error: null }) => void
    const insert = vi.fn(() => new Promise((resolve) => { resolveInsert = resolve }))
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation((table: string) => table === 'saved_properties'
      ? {
          select: () => ({ eq: (_column: string, userId: string) => new Promise((resolve) => {
            mocks.requests.push(resolve)
            expect(userId).toBe('user-a')
          }) }),
          insert,
        }
      : {})

    render(<SavedPropertiesProvider><FavoritesState allowToggle /></SavedPropertiesProvider>)
    await waitFor(() => expect(mocks.requests).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))
    expect(screen.getByRole('status')).toHaveTextContent('loading:property-new')
    await act(async () => resolveInsert({ error: null }))

    await act(async () => mocks.requests[0]({ data: [], error: null }))
    await waitFor(() => expect(mocks.requests).toHaveLength(2))
    await act(async () => mocks.requests[1]({ data: [{ property_id: 'property-new' }], error: null }))

    expect(screen.getByRole('status')).toHaveTextContent('ready:property-new')
  })

  it('does not apply a refresh that finishes before an in-flight favorite write', async () => {
    let resolveInsert!: (value: { error: null }) => void
    const insert = vi.fn(() => new Promise((resolve) => { resolveInsert = resolve }))
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } })
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation((table: string) => table === 'saved_properties'
      ? {
          select: () => ({ eq: (_column: string, userId: string) => new Promise((resolve) => {
            mocks.requests.push(resolve)
            expect(userId).toBe('user-a')
          }) }),
          insert,
        }
      : {})

    render(<SavedPropertiesProvider><FavoritesState allowToggle /></SavedPropertiesProvider>)
    await waitFor(() => expect(mocks.requests).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: /guardar propiedad/i }))

    // The initial pre-mutation snapshot is rejected while the write is active.
    await act(async () => mocks.requests[0]({ data: [], error: null }))
    fireEvent.click(screen.getByRole('button', { name: /reintentar carga/i }))
    await waitFor(() => expect(mocks.requests).toHaveLength(2))
    // The refresh started after the optimistic toggle but its DB read can
    // still finish before the insert reaches the database.
    await act(async () => mocks.requests[1]({ data: [], error: null }))
    expect(screen.getByRole('status')).toHaveTextContent('loading:property-new')

    await act(async () => resolveInsert({ error: null }))
    await waitFor(() => expect(mocks.requests).toHaveLength(3))
    await act(async () => mocks.requests[2]({ data: [{ property_id: 'property-new' }], error: null }))
    expect(screen.getByRole('status')).toHaveTextContent('ready:property-new')
  })

  it('does not let a stale initial session lookup replace a newer auth event', async () => {
    let resolveInitialSession!: (value: { data: { session: { user: { id: string } } } }) => void
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveInitialSession = resolve }))
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.from.mockImplementation(() => ({
      select: () => ({
        eq: (_column: string, userId: string) => new Promise((resolve) => {
          mocks.requests.push(resolve)
          expect(userId).toBe('user-b')
        }),
      }),
    }))

    render(<SavedPropertiesProvider><FavoritesState /></SavedPropertiesProvider>)
    act(() => mocks.authListener?.('SIGNED_IN', { user: { id: 'user-b' } }))
    await waitFor(() => expect(mocks.requests).toHaveLength(1))

    await act(async () => resolveInitialSession({ data: { session: { user: { id: 'user-a' } } } }))
    await act(async () => mocks.requests[0]({ data: [{ property_id: 'property-b' }], error: null }))

    expect(screen.getByRole('status')).toHaveTextContent('ready:property-b')
    expect(mocks.from).toHaveBeenCalledTimes(1)
  })
})
