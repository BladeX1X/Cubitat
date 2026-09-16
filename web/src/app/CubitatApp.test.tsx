import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthModalProvider } from '../modules/auth/contexts/AuthModalContext'
import { CubitatApp } from './CubitatApp'

const mocks = vi.hoisted(() => {
  const signOut = vi.fn()
  const clearCachedProperties = vi.fn()
  const removeLegacyPublicationDraft = vi.fn()
  const unsubscribe = vi.fn()

  const user = {
    id: 'admin-user',
    email: 'admin@example.test',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-07-30T00:00:00.000Z',
  }

  return {
    reconcilePushSession: vi.fn(),
    disablePushNotifications: vi.fn(),
    markPushNotificationAsRead: vi.fn(),
    signOut,
    clearCachedProperties,
    removeLegacyPublicationDraft,
    unsubscribe,
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    from: vi.fn(),
    user,
  }
})

vi.mock('../modules/notifications/push/pushService', () => ({
  reconcilePushSession: mocks.reconcilePushSession,
  disablePushNotifications: mocks.disablePushNotifications,
  getPushAvailability: () => 'unsupported',
  getCurrentPushSubscription: vi.fn(),
  preparePushNotifications: vi.fn(),
  enablePushNotifications: vi.fn(),
}))

vi.mock('../modules/notifications/notificationRead', async (importOriginal) => ({
  ...await importOriginal<typeof import('../modules/notifications/notificationRead')>(),
  markNotificationAsRead: mocks.markPushNotificationAsRead,
}))

vi.mock('../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}))

vi.mock('../shared/lib/offlineCache', () => ({
  clearCachedProperties: mocks.clearCachedProperties,
  getCachedProperties: vi.fn().mockResolvedValue([]),
  getCachedProperty: vi.fn().mockResolvedValue(null),
  saveCachedProperties: vi.fn().mockResolvedValue(undefined),
  saveCachedProperty: vi.fn().mockResolvedValue(undefined),
  saveSingleCachedProperty: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../pages/publish/draftStorage', () => ({
  removeLegacyPublicationDraft: mocks.removeLegacyPublicationDraft,
}))

vi.mock('../shared/lib/analytics', () => ({
  initAnalytics: vi.fn(),
  trackPageView: vi.fn(),
}))

vi.mock('../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(),
  sanitizeErrorReason: vi.fn(() => 'test_error'),
}))

vi.mock('../modules/agents/agentRepository', () => ({
  fetchVerifiedAgentIds: vi.fn().mockResolvedValue(new Set()),
}))

vi.mock('../components/layout/Header', () => ({
  Header: () => <div data-testid="header" />,
}))

vi.mock('../components/layout/SiteFooter', () => ({
  SiteFooter: () => <div data-testid="footer" />,
}))

vi.mock('../components/layout/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => null,
}))

vi.mock('../pages/home/HomePage', () => ({
  HomePage: () => <div>Inicio Cubitat</div>,
}))

vi.mock('../pages/moderar/AdminPage', () => ({
  AdminPage: ({ onSessionExpired }: { onSessionExpired: () => Promise<void> | void }) => (
    <button type="button" onClick={() => void onSessionExpired()}>
      Simular sesión MFA expirada
    </button>
  ),
}))

vi.mock('../modules/auth/components/LoginModal', () => ({
  LoginModal: () => <div role="dialog" aria-label="Iniciar sesión" />,
}))

describe('CubitatApp', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/moderar')
    window.localStorage.setItem('20260710-clear-stale-pwa-v2', 'done')

    mocks.signOut.mockResolvedValue({ error: null })
    mocks.reconcilePushSession.mockResolvedValue(undefined)
    mocks.disablePushNotifications.mockResolvedValue(undefined)
    mocks.markPushNotificationAsRead.mockResolvedValue(undefined)
    mocks.clearCachedProperties.mockResolvedValue(undefined)
    mocks.getSession.mockResolvedValue({
      data: { session: { user: mocks.user } },
      error: null,
    })
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    })
    mocks.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('cierra la sesión expirada, limpia datos locales, vuelve al inicio y abre el login', async () => {
    render(
      <AuthModalProvider>
        <CubitatApp />
      </AuthModalProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /simular sesión mfa expirada/i }))

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledOnce()
      expect(mocks.disablePushNotifications).toHaveBeenCalledOnce()
      expect(mocks.clearCachedProperties).toHaveBeenCalledOnce()
      expect(mocks.removeLegacyPublicationDraft).toHaveBeenCalledOnce()
    })
    expect(mocks.disablePushNotifications.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0])
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.clearCachedProperties.mock.invocationCallOrder[0],
    )
    expect(mocks.clearCachedProperties.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.removeLegacyPublicationDraft.mock.invocationCallOrder[0],
    )
    expect(window.location.pathname).toBe('/')
    expect(await screen.findByText('Inicio Cubitat')).toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('reconciles push for initial session and account changes', async () => {
    render(<AuthModalProvider><CubitatApp /></AuthModalProvider>)
    await waitFor(() => expect(mocks.reconcilePushSession).toHaveBeenCalledWith('admin-user'))
    const callback = mocks.onAuthStateChange.mock.calls[0][0]
    callback('SIGNED_IN', { user: { ...mocks.user, id: 'second-user' } })
    await waitFor(() => expect(mocks.reconcilePushSession).toHaveBeenCalledWith('second-user'))
    callback('SIGNED_OUT', null)
    await waitFor(() => expect(mocks.reconcilePushSession).toHaveBeenCalledWith(null))
  })

  it('marks a push notification as read and removes its internal URL marker', async () => {
    window.history.replaceState(
      null,
      '',
      '/moderar?cubitat_notification=8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f',
    )

    render(<AuthModalProvider><CubitatApp /></AuthModalProvider>)

    await waitFor(() => expect(mocks.markPushNotificationAsRead).toHaveBeenCalledWith(
      'admin-user',
      '8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f',
    ))
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('nombra Publicar a la acción principal de la navegación móvil', async () => {
    window.history.replaceState(null, '', '/')
    render(<AuthModalProvider><CubitatApp /></AuthModalProvider>)

    expect(await screen.findByRole('button', { name: 'Publicar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vender' })).not.toBeInTheDocument()
  })
})
