import { afterEach, describe, expect, it } from 'vitest'
import { clearReferralId, getReferralId, isValidAgentReferralCode, trackReferral } from './tracker'

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

  it('strips a referral URL without storing or returning attribution while paused', () => {
    window.history.replaceState({}, '', '/propiedad/casa?ref=ag-12ab34cd&source=whatsapp#contactar-anunciante')

    expect(trackReferral()).toBeNull()
    expect(getReferralId()).toBeNull()
    expect(sessionStorage.getItem('cubitat_referral_id')).toBeNull()
    expect(window.location.pathname + window.location.search + window.location.hash)
      .toBe('/propiedad/casa?source=whatsapp#contactar-anunciante')
  })

  it('clears a legacy attribution when an invalid referral code arrives', () => {
    sessionStorage.setItem('cubitat_referral_id', 'AG-12AB34CD')
    window.history.replaceState({}, '', '/?ref=not-a-code')

    expect(trackReferral()).toBeNull()
    expect(sessionStorage.getItem('cubitat_referral_id')).toBeNull()
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
})
