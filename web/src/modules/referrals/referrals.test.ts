import { describe, expect, it, vi } from 'vitest'
import { extractReferralCode } from './referrals'

describe('extractReferralCode', () => {
  it('extracts referral code and stores it in sessionStorage', () => {
    const storage = {
      setItem: vi.fn(),
    }
    const search = '?ref=REF-12345678'
    const user = null

    const result = extractReferralCode(search, user, storage)

    expect(result).toBe('REF-12345678')
    expect(storage.setItem).toHaveBeenCalledWith('cubitat_referral_code', 'REF-12345678')
  })

  it('ignores the referral code if it is a self-referral', () => {
    const storage = {
      setItem: vi.fn(),
    }
    const search = '?ref=REF-12345678'
    const user = { id: '12345678-abcd-1234-abcd-1234567890ab' }

    const result = extractReferralCode(search, user, storage)

    expect(result).toBeNull()
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('returns null if there is no ref parameter in URL', () => {
    const storage = {
      setItem: vi.fn(),
    }
    const search = '?other=something'
    const user = null

    const result = extractReferralCode(search, user, storage)

    expect(result).toBeNull()
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})
