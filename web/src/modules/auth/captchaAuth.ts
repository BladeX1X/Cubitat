import { supabase, supabaseRecovery } from '../../shared/lib/supabaseClient'

type SignUpWithCaptchaInput = {
  email: string
  password: string
  fullName: string
  captchaToken: string
  emailRedirectTo: string
}

type PasswordResetWithCaptchaInput = {
  email: string
  captchaToken: string
  redirectTo: string
}

export function signUpWithCaptcha({
  email,
  password,
  fullName,
  captchaToken,
  emailRedirectTo,
}: SignUpWithCaptchaInput) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      emailRedirectTo,
      data: {
        full_name: fullName,
        role: 'buyer',
      },
    },
  })
}

export function requestPasswordResetWithCaptcha({
  email,
  captchaToken,
  redirectTo,
}: PasswordResetWithCaptchaInput) {
  return supabaseRecovery.auth.resetPasswordForEmail(email, {
    captchaToken,
    redirectTo,
  })
}
