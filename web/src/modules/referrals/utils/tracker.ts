/**
 * Referrals tracker utility.
 * Removes deferred referral parameters and legacy session state while the
 * referral program is paused pending owner approval.
 */

import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger';

const REFERRAL_STORAGE_KEY = 'cubitat_referral_id';
const REFERRAL_CODE_PATTERN = /^AG-[0-9A-F]{8}$/i

export function isValidAgentReferralCode(value: string): boolean {
  return REFERRAL_CODE_PATTERN.test(value.trim())
}
/**
 * Scrubs referral attribution from the URL and storage without recording it.
 */
export function trackReferral(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasReferralParameter = urlParams.has('ref')
    if (hasReferralParameter) {
      urlParams.delete('ref')
      const search = urlParams.toString()
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
      )
    }
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY)
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
