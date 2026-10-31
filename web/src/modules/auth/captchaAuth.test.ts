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
