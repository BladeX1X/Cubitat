import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthCallbackPage } from './AuthCallbackPage'

const {
  cleanAuthUrlMock,
  consumeAuthReturnPathMock,
  exchangeCodeForSessionMock,
  getAuthUrlParamsMock,
  setSessionMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  cleanAuthUrlMock: vi.fn(),
  consumeAuthReturnPathMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  getAuthUrlParamsMock: vi.fn(),
  setSessionMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getSession: vi.fn(),
      setSession: setSessionMock,
      verifyOtp: verifyOtpMock,
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
      refreshToken: null,
      tokenHash: null,
      type: null,
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
      expect(verifyOtpMock).not.toHaveBeenCalled()
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
      tokenHash: null,
      type: null,
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
    expect(verifyOtpMock).not.toHaveBeenCalled()
  })

  it('verifies portable signup token hashes without PKCE storage', async () => {
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: null,
      code: null,
      error: null,
      isOAuthCallback: false,
      refreshToken: null,
      tokenHash: 'portable-signup-token',
      type: 'signup',
    })
    verifyOtpMock.mockResolvedValue({
      data: {
        user: {
          app_metadata: {
            provider: 'email',
            providers: ['email'],
          },
        },
      },
      error: null,
    })

    const { findByText } = render(<AuthCallbackPage onContinue={vi.fn()} />)

    expect(await findByText('Correo confirmado')).toBeTruthy()
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: 'portable-signup-token',
      type: 'signup',
    })
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled()
    expect(cleanAuthUrlMock).toHaveBeenCalledWith('/auth/callback')
  })

  it('does not expose raw PKCE verifier errors to the user', async () => {
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: null,
      code: 'pkce-code',
      error: null,
      isOAuthCallback: false,
      refreshToken: null,
      tokenHash: null,
      type: null,
    })
    exchangeCodeForSessionMock.mockResolvedValue({
      data: null,
      error: new Error('PKCE code verifier not found in storage.'),
    })

    const { findByText, queryByText } = render(<AuthCallbackPage onContinue={vi.fn()} />)

    expect(await findByText('No pudimos confirmar este enlace. Solicita uno nuevo o vuelve a iniciar el registro.')).toBeTruthy()
    expect(queryByText(/PKCE code verifier not found/i)).toBeNull()
  })

  it('does not expose raw expired email link errors to the user', async () => {
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: null,
      code: null,
      error: null,
      isOAuthCallback: false,
      refreshToken: null,
      tokenHash: 'expired-signup-token',
      type: 'signup',
    })
    verifyOtpMock.mockResolvedValue({
      data: null,
      error: new Error('Email link is invalid or has expired'),
    })

    const { findByText, queryByText } = render(<AuthCallbackPage onContinue={vi.fn()} />)

    expect(await findByText('No pudimos confirmar este enlace. Solicita uno nuevo o vuelve a iniciar el registro.')).toBeTruthy()
    expect(queryByText(/Email link is invalid or has expired/i)).toBeNull()
  })
})
