/**
 * Referrals tracker utility.
 * Captures '?ref=xxx' query parameters from the URL and persists them.
 */

const REFERRAL_STORAGE_KEY = 'cubitat_referral_id';

/**
 * Checks the current URL for a referral parameter and saves it to sessionStorage if found.
 */
export function trackReferral(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    if (ref && ref.trim().length > 0) {
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim());
      return ref.trim();
    }
  } catch (err) {
    console.error('Error tracking referral:', err);
  }

  return null;
}

/**
 * Returns the currently stored referral ID, if any.
 */
export function getReferralId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return sessionStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch (err) {
    console.error('Error getting referral ID:', err);
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
    console.error('Error clearing referral ID:', err);
  }
}
