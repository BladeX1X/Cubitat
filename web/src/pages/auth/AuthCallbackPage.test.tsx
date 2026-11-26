import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthCallbackPage } from './AuthCallbackPage'
import { getSignupReferralCode } from '../../modules/referrals/utils/tracker'

const {
  cleanAuthUrlMock,
  consumeAuthReturnPathMock,
  exchangeCodeForSessionMock,
  getAuthUrlParamsMock,
  rpcMock,
  setSessionMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  cleanAuthUrlMock: vi.fn(),
  consumeAuthReturnPathMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  getAuthUrlParamsMock: vi.fn(),
  rpcMock: vi.fn(),
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
    rpc: rpcMock,
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
    sessionStorage.clear()
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

  afterEach(() => {
    sessionStorage.clear()
    window.history.replaceState(null, '', '/')
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

  it('attributes a new Google signup from the referral code captured before OAuth', async () => {
    sessionStorage.setItem('cubitat_signup_referral_code', 'ag-bc7d3fde')
    rpcMock.mockResolvedValue({ data: true, error: null })
    const onContinue = vi.fn()

    render(<AuthCallbackPage onContinue={onContinue} />)

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('attribute_own_oauth_agent_signup', {
        p_referral_code: 'AG-BC7D3FDE',
      })
      expect(onContinue).toHaveBeenCalledOnce()
    })
    expect(getSignupReferralCode()).toBeNull()
  })

  it('keeps referral signup available for retry if attribution RPC fails without blocking login', async () => {
    sessionStorage.setItem('cubitat_signup_referral_code', 'AG-BC7D3FDE')
    rpcMock.mockResolvedValue({ data: null, error: new Error('temporary failure') })
    const onContinue = vi.fn()

    render(<AuthCallbackPage onContinue={onContinue} />)

    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce())
    expect(getSignupReferralCode()).toBe('AG-BC7D3FDE')
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
