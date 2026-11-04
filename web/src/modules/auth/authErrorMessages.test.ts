import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from './authErrorMessages'

describe('getAuthErrorMessage Turnstile errors', () => {
  it('explains that Supabase rejected the challenge instead of blaming browser permissions', () => {
    expect(getAuthErrorMessage({ code: 'captcha_failed', message: 'captcha verification failed' }, 'Fallback'))
      .toBe('Supabase no pudo validar la verificación de seguridad. Completa un nuevo desafío e inténtalo otra vez.')
  })

  it('uses the same actionable message when Supabase only returns a CAPTCHA message', () => {
    expect(getAuthErrorMessage(new Error('captcha verification failed'), 'Fallback'))
      .toBe('Supabase no pudo validar la verificación de seguridad. Completa un nuevo desafío e inténtalo otra vez.')
  })
})
