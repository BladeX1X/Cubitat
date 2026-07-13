import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanAuthUrl, getAuthUrlParams, isPasswordRecoveryFlow } from './authUrlParams'

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('auth URL parameters', () => {
  it('reads a PKCE code from the query string', () => {
    window.history.replaceState(null, '', '/auth/callback?code=pkce-code')
    expect(getAuthUrlParams()).toMatchObject({ code: 'pkce-code', error: null, isOAuthCallback: false })
  })

  it('reads recovery tokens and errors from the hash', () => {
    window.history.replaceState(null, '', '/recuperar-contrasena#access_token=access&refresh_token=refresh&type=recovery&error_description=expired')
    expect(getAuthUrlParams()).toMatchObject({ accessToken: 'access', refreshToken: 'refresh', type: 'recovery', error: 'expired' })
  })

  it('reads a portable recovery token hash from the query string', () => {
    window.history.replaceState(null, '', '/recuperar-contrasena?token_hash=portable-hash&type=recovery')
    expect(getAuthUrlParams()).toMatchObject({ tokenHash: 'portable-hash', type: 'recovery' })
  })

  it.each(['/auth/callback?flow=oauth', '/auth/callback?state=opaque-state', '/auth/callback#provider=google'])(
    'recognizes OAuth callback marker in %s',
    (url) => {
      window.history.replaceState(null, '', url)
      expect(getAuthUrlParams().isOAuthCallback).toBe(true)
    },
  )

  it('cleans sensitive parameters while preserving the route', () => {
    window.history.replaceState(null, '', '/auth/callback?code=secret#access_token=secret')
    const replaceState = vi.spyOn(window.history, 'replaceState')
    cleanAuthUrl('/auth/callback')
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/auth/callback')
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
  })

  it('does not treat a normal authenticated session as password recovery', () => {
    expect(isPasswordRecoveryFlow(null, false, false)).toBe(false)
    expect(isPasswordRecoveryFlow('signup', false, true)).toBe(false)
    expect(isPasswordRecoveryFlow('recovery', false, false)).toBe(true)
    expect(isPasswordRecoveryFlow(null, true, false)).toBe(false)
    expect(isPasswordRecoveryFlow(null, true, true)).toBe(true)
  })
})
