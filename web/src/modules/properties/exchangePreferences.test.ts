import { describe, expect, it } from 'vitest'
import {
  buildExchangePreferences,
  emptyExchangePreferencesForm,
  getExchangePreferences,
  isExchangePreferencesFormValid,
} from './exchangePreferences'

describe('exchange preferences', () => {
  it('builds structured preferences and converts numeric fields', () => {
    expect(buildExchangePreferences({
      ...emptyExchangePreferencesForm,
      propertyType: 'apartamento',
      province: 'La Habana',
      municipality: 'Playa',
      minBedrooms: 2,
      minAreaM2: '70',
      notes: 'Preferiblemente cerca del mar.',
      cashAdjustment: 'pay',
      cashAmountUsd: '15000',
    })).toEqual({
      propertyType: 'apartamento',
      province: 'La Habana',
      municipality: 'Playa',
      minBedrooms: 2,
      minAreaM2: 70,
      notes: 'Preferiblemente cerca del mar.',
      cashAdjustment: { direction: 'pay', amountUsd: 15000 },
    })
  })

  it('requires a desired type and a positive amount only when money changes hands', () => {
    expect(isExchangePreferencesFormValid(emptyExchangePreferencesForm)).toBe(false)
    expect(isExchangePreferencesFormValid({
      ...emptyExchangePreferencesForm,
      propertyType: 'indiferente',
      cashAdjustment: 'negotiable',
    })).toBe(true)
    expect(isExchangePreferencesFormValid({
      ...emptyExchangePreferencesForm,
      propertyType: 'casa',
      cashAdjustment: 'receive',
      cashAmountUsd: '0',
    })).toBe(false)
  })

  it('ignores malformed legacy data instead of breaking a property page', () => {
    expect(getExchangePreferences({ exchangePreferences: 'texto antiguo' })).toBeNull()
    expect(getExchangePreferences({ exchangePreferences: { propertyType: 'castillo' } })).toBeNull()
  })
})
