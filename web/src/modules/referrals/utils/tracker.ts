/**
 * Captures a public agent code only for the account signup flow. Visit counts,
 * contact attribution, and commissions remain separate and disabled.
 */

import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger';

const REFERRAL_STORAGE_KEY = 'cubitat_referral_id';
const SIGNUP_REFERRAL_STORAGE_KEY = 'cubitat_signup_referral_code';
const REFERRAL_CODE_PATTERN = /^AG-[0-9A-F]{8}$/i

export function isValidAgentReferralCode(value: string): boolean {
  return REFERRAL_CODE_PATTERN.test(value.trim())
}
/**
 * Captures a valid code for registration, removes it from the URL, and clears
 * the legacy contact attribution key. The server resolves the code to an agent.
 */
export function trackReferral(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasReferralParameter = urlParams.has('ref')
    if (hasReferralParameter) {
      const incomingCode = urlParams.get('ref')?.trim().toUpperCase() ?? ''
      if (isValidAgentReferralCode(incomingCode)) {
        sessionStorage.setItem(SIGNUP_REFERRAL_STORAGE_KEY, incomingCode)
      } else {
        sessionStorage.removeItem(SIGNUP_REFERRAL_STORAGE_KEY)
      }
      urlParams.delete('ref')
      const search = urlParams.toString()
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
      )
    }
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY)
    return getSignupReferralCode()
  } catch (err) {
    logSafeEvent({
      module: 'referrals',
      action: 'track_referral',
      level: 'error',
      code: sanitizeErrorReason(err),
    });
  }

  return null;
}

/**
 * Referral attribution is paused; clear any legacy code instead of using it.
 */
export function getReferralId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY)
    return null
  } catch (err) {
    logSafeEvent({
      module: 'referrals',
      action: 'get_referral',
      level: 'error',
      code: sanitizeErrorReason(err),
    });
    return null;
  }
}

/** Returns only the validated signup code; it never resolves agent identity. */
export function getSignupReferralCode(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const code = sessionStorage.getItem(SIGNUP_REFERRAL_STORAGE_KEY)?.trim().toUpperCase()
    if (!code || !isValidAgentReferralCode(code)) {
      sessionStorage.removeItem(SIGNUP_REFERRAL_STORAGE_KEY)
      return null
    }
    return code
  } catch (err) {
    logSafeEvent({
      module: 'referrals',
      action: 'get_signup_referral',
      level: 'error',
      code: sanitizeErrorReason(err),
    })
    return null
  }
}

/** Clears signup attribution after Auth accepted a signup request. */
export function clearSignupReferralCode(): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(SIGNUP_REFERRAL_STORAGE_KEY)
  } catch (err) {
    logSafeEvent({
      module: 'referrals',
      action: 'clear_signup_referral',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
  }
}

/**
 * Clears the stored referral ID from storage. Called after a successful conversion (lead submit).
 */
export function clearReferralId(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (err) {
    logSafeEvent({
      module: 'referrals',
      action: 'clear_referral',
      level: 'error',
      code: sanitizeErrorReason(err),
    });
  }
}
