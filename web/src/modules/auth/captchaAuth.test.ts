import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  requestPasswordResetWithCaptcha,
  signUpWithCaptcha,
} from './captchaAuth'

const { resetPasswordForEmailMock, signUpMock } = vi.hoisted(() => ({
  resetPasswordForEmailMock: vi.fn(),
  signUpMock: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: resetPasswordForEmailMock,
      signUp: signUpMock,
    },
  },
}))

describe('Supabase Auth CAPTCHA contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('binds the Turnstile token to the sign-up request', async () => {
    signUpMock.mockResolvedValueOnce({ data: { user: null }, error: null })

    await signUpWithCaptcha({
      email: 'qa@example.com',
      password: 'Secure1!',
      fullName: 'QA Auth',
      captchaToken: 'turnstile-signup-token',
      emailRedirectTo: 'https://cubitathome.com/auth/callback',
    })

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'qa@example.com',
      password: 'Secure1!',
      options: {
        captchaToken: 'turnstile-signup-token',
        emailRedirectTo: 'https://cubitathome.com/auth/callback',
        data: {
          full_name: 'QA Auth',
          role: 'buyer',
        },
      },
    })
  })

  it('passes only the captured referral code as untrusted signup metadata', async () => {
    sessionStorage.setItem('cubitat_signup_referral_code', 'AG-12AB34CD')
    signUpMock.mockResolvedValueOnce({ data: { user: { id: 'new-user' } }, error: null })

    await signUpWithCaptcha({
      email: 'qa@example.com',
      password: 'Secure1!',
      fullName: 'QA Auth',
      captchaToken: 'turnstile-signup-token',
      emailRedirectTo: 'https://cubitathome.com/auth/callback',
    })

    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: expect.objectContaining({ referral_code: 'AG-12AB34CD' }),
      }),
    }))
    expect(sessionStorage.getItem('cubitat_signup_referral_code')).toBeNull()
  })

  it('keeps the signup referral available if Auth returns an error', async () => {
    sessionStorage.setItem('cubitat_signup_referral_code', 'AG-12AB34CD')
    signUpMock.mockResolvedValueOnce({ data: { user: null }, error: { message: 'temporarily unavailable' } })

    const result = await signUpWithCaptcha({
      email: 'qa@example.com',
      password: 'Secure1!',
      fullName: 'QA Auth',
      captchaToken: 'turnstile-signup-token',
      emailRedirectTo: 'https://cubitathome.com/auth/callback',
    })

    expect(result.error).toBeTruthy()
    expect(sessionStorage.getItem('cubitat_signup_referral_code')).toBe('AG-12AB34CD')
  })

  it('binds the Turnstile token to the password recovery request', async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ data: {}, error: null })

    await requestPasswordResetWithCaptcha({
      email: 'qa@example.com',
      captchaToken: 'turnstile-recovery-token',
      redirectTo: 'https://cubitathome.com/recuperar-contrasena',
    })

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('qa@example.com', {
      captchaToken: 'turnstile-recovery-token',
      redirectTo: 'https://cubitathome.com/recuperar-contrasena',
    })
  })
})
