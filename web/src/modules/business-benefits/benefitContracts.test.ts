import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseBusinessBenefits, validateBenefitGrant } from './benefitContracts'

describe('F4-BIZ contract parsing', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps only complete, allowed benefit records', () => {
    expect(parseBusinessBenefits([
      { id: 'a', target_type: 'account', target_id: 'b', benefit_code: 'commercial_badge', starts_at: '2026-10-01T00:00:00Z', expires_at: '2026-11-01T00:00:00Z', granted_by: 'c', grant_reason: 'Campaña', revoked_at: null, revoked_by: null, revocation_reason: null, created_at: '2026-10-01T00:00:00Z' },
      { id: 'unsafe', target_type: 'unknown', target_id: 'b', benefit_code: 'commercial_badge' },
      null,
    ])).toHaveLength(1)
  })

  it('rejects invalid or expired grant forms and accepts a valid range', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'))
    expect(validateBenefitGrant({ targetId: '', startsAt: '2026-10-01T10:00', expiresAt: '2026-11-01T10:00', reason: 'ok' })).toBe('INVALID_TARGET')
    expect(validateBenefitGrant({ targetId: '1bd89b1b-8972-45da-88ef-bcd877883bc3', startsAt: '2026-11-01T10:00', expiresAt: '2026-10-01T10:00', reason: 'Motivo válido' })).toBe('INVALID_DATES')
    expect(validateBenefitGrant({ targetId: '1bd89b1b-8972-45da-88ef-bcd877883bc3', startsAt: '2024-10-01T10:00', expiresAt: '2024-11-01T10:00', reason: 'Motivo válido' })).toBe('INVALID_DATES')
    expect(validateBenefitGrant({ targetId: '1bd89b1b-8972-45da-88ef-bcd877883bc3', startsAt: '2026-10-01T10:00', expiresAt: '2026-11-01T10:00', reason: 'Motivo válido' })).toBeNull()
  })
})
