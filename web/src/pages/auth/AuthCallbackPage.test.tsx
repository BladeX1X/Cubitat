import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthCallbackPage } from './AuthCallbackPage'

const {
  cleanAuthUrlMock,
  consumeAuthReturnPathMock,
  exchangeCodeForSessionMock,
  getAuthUrlParamsMock,
  setSessionMock,
} = vi.hoisted(() => ({
  cleanAuthUrlMock: vi.fn(),
  consumeAuthReturnPathMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  getAuthUrlParamsMock: vi.fn(),
  setSessionMock: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getSession: vi.fn(),
      setSession: setSessionMock,
    },
  },
}))

vi.mock('./authUrlParams', () => ({
  cleanAuthUrl: cleanAuthUrlMock,
  getAuthUrlParams: getAuthUrlParamsMock,
}))

vi.mock('../../modules/auth/utils/authRedirects', () => ({
  consumeAuthReturnPath: consumeAuthReturnPathMock,
}))

describe('AuthCallbackPage PKCE exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/auth/callback?flow=oauth&code=pkce-code')
    getAuthUrlParamsMock.mockReturnValue({
      code: 'pkce-code',
      error: null,
      isOAuthCallback: true,
    })
    exchangeCodeForSessionMock.mockResolvedValue({
      data: {
        user: {
          app_metadata: {
            provider: 'google',
            providers: ['google'],
          },
        },
      },
      error: null,
    })
    consumeAuthReturnPathMock.mockReturnValue(null)
  })

  it('exchanges the OAuth code once and continues without an error screen', async () => {
    const onContinue = vi.fn()

    render(<AuthCallbackPage onContinue={onContinue} />)

    await waitFor(() => {
      expect(exchangeCodeForSessionMock).toHaveBeenCalledTimes(1)
      expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('pkce-code')
      expect(onContinue).toHaveBeenCalledTimes(1)
    })

    expect(window.location.pathname).toBe('/')
    expect(cleanAuthUrlMock).not.toHaveBeenCalled()
  })

  it('creates the session explicitly for legacy callback tokens', async () => {
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: 'legacy-access-token',
      code: null,
      error: null,
      isOAuthCallback: false,
      refreshToken: 'legacy-refresh-token',
    })
    setSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            app_metadata: {
              provider: 'email',
              providers: ['email'],
            },
          },
        },
      },
      error: null,
    })

    render(<AuthCallbackPage onContinue={vi.fn()} />)

    await waitFor(() => {
      expect(setSessionMock).toHaveBeenCalledTimes(1)
      expect(setSessionMock).toHaveBeenCalledWith({
        access_token: 'legacy-access-token',
        refresh_token: 'legacy-refresh-token',
      })
    })

    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled()
  })
})
