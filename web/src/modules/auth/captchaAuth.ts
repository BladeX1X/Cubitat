import { supabase } from '../../shared/lib/supabaseClient'
import { clearSignupReferralCode, getSignupReferralCode } from '../referrals/utils/tracker'

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
  const referralCode = getSignupReferralCode()
  return supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      emailRedirectTo,
      data: {
        full_name: fullName,
        role: 'buyer',
        ...(referralCode ? { referral_code: referralCode } : {}),
      },
    },
  }).then((result) => {
    if (!result.error && result.data.user) clearSignupReferralCode()
    return result
  })
}

export function requestPasswordResetWithCaptcha({
  email,
  captchaToken,
  redirectTo,
}: PasswordResetWithCaptchaInput) {
  return supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
    redirectTo,
  })
}
