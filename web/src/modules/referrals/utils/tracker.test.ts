import { afterEach, describe, expect, it } from 'vitest'
import {
  clearReferralId,
  clearSignupReferralCode,
  getReferralId,
  getSignupReferralCode,
  isValidAgentReferralCode,
  trackReferral,
} from './tracker'

describe('agent referral tracker', () => {
  afterEach(() => {
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('accepts only the public agent code format', () => {
    expect(isValidAgentReferralCode('AG-12AB34CD')).toBe(true)
    expect(isValidAgentReferralCode('REF-12AB34CD')).toBe(false)
    expect(isValidAgentReferralCode('AG-12AB34C<script>')).toBe(false)
  })

  it('stores a signup referral code, strips it from the URL, and preserves unrelated navigation state', () => {
    window.history.replaceState({}, '', '/propiedad/casa?ref=ag-12ab34cd&source=whatsapp#contactar-anunciante')

    expect(trackReferral()).toBe('AG-12AB34CD')
    expect(getReferralId()).toBeNull()
    expect(getSignupReferralCode()).toBe('AG-12AB34CD')
    expect(sessionStorage.getItem('cubitat_referral_id')).toBeNull()
    expect(window.location.pathname + window.location.search + window.location.hash)
      .toBe('/propiedad/casa?source=whatsapp#contactar-anunciante')
  })

  it('clears signup attribution when an invalid referral code arrives', () => {
    sessionStorage.setItem('cubitat_referral_id', 'AG-12AB34CD')
    sessionStorage.setItem('cubitat_signup_referral_code', 'AG-12AB34CD')
    window.history.replaceState({}, '', '/?ref=not-a-code')

    expect(trackReferral()).toBeNull()
    expect(getSignupReferralCode()).toBeNull()
    expect(sessionStorage.getItem('cubitat_referral_id')).toBeNull()
    expect(sessionStorage.getItem('cubitat_signup_referral_code')).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('removes an empty ref parameter and clears existing attribution', () => {
    sessionStorage.setItem('cubitat_referral_id', 'AG-12AB34CD')
    window.history.replaceState({}, '', '/?ref=&source=chat')

    expect(trackReferral()).toBeNull()
    expect(sessionStorage.getItem('cubitat_referral_id')).toBeNull()
    expect(window.location.search).toBe('?source=chat')
  })

  it('never returns a legacy stored code while referrals are paused', () => {
    sessionStorage.setItem('cubitat_referral_id', 'malformed')
    expect(getReferralId()).toBeNull()
    sessionStorage.setItem('cubitat_referral_id', 'AG-12AB34CD')
    expect(getReferralId()).toBeNull()
    expect(sessionStorage.getItem('cubitat_referral_id')).toBeNull()
    clearReferralId()
  })

  it('validates signup codes read from session storage and clears them after signup', () => {
    sessionStorage.setItem('cubitat_signup_referral_code', 'bad-code')
    expect(getSignupReferralCode()).toBeNull()
    expect(sessionStorage.getItem('cubitat_signup_referral_code')).toBeNull()

    sessionStorage.setItem('cubitat_signup_referral_code', 'ag-12ab34cd')
    expect(getSignupReferralCode()).toBe('AG-12AB34CD')
    clearSignupReferralCode()
    expect(getSignupReferralCode()).toBeNull()
  })
})
