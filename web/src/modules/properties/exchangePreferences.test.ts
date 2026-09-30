import { describe, expect, it } from 'vitest'
import {
  buildExchangePreferences,
  emptyExchangePreferencesForm,
  exchangePreferencesToForm,
  formatExchangeCashAdjustment,
  getExchangePropertyTypeLabel,
  getExchangePreferences,
  isExchangePreferencesFormValid,
} from './exchangePreferences'

describe('exchangePreferences', () => {
  it('builds structured preferences and normalizes optional values', () => {
    const result = buildExchangePreferences({
      ...emptyExchangePreferencesForm,
      propertyType: 'apartamento',
      province: 'La Habana',
      municipality: 'Playa',
      minBedrooms: 2.8,
      minAreaM2: '75.5',
      notes: '  Cerca del mar  ',
      cashAdjustment: 'pay',
      cashAmountUsd: '12000',
    })

    expect(result).toEqual({
      propertyType: 'apartamento',
      province: 'La Habana',
      municipality: 'Playa',
      minBedrooms: 2,
      minAreaM2: 75.5,
      notes: 'Cerca del mar',
      cashAdjustment: { direction: 'pay', amountUsd: 12000 },
    })
  })

  it('requires a requested property type and a valid amount when money is involved', () => {
    expect(isExchangePreferencesFormValid(emptyExchangePreferencesForm)).toBe(false)
    expect(isExchangePreferencesFormValid({
      ...emptyExchangePreferencesForm,
      propertyType: 'indiferente',
      cashAdjustment: 'pay',
    })).toBe(false)
    expect(isExchangePreferencesFormValid({
      ...emptyExchangePreferencesForm,
      propertyType: 'indiferente',
      cashAdjustment: 'pay',
      cashAmountUsd: '25000',
    })).toBe(true)
  })

  it('ignores malformed stored preferences instead of breaking the form', () => {
    expect(getExchangePreferences({ exchangePreferences: { propertyType: 'unknown' } })).toBeNull()
    expect(exchangePreferencesToForm({ exchangePreferences: { propertyType: 'unknown' } }))
      .toEqual(emptyExchangePreferencesForm)
    expect(getExchangePreferences({ exchangePreferences: ['old-format'] })).toBeNull()
  })

  it('hydrates valid stored preferences back into editable fields', () => {
    expect(exchangePreferencesToForm({
      exchangePreferences: {
        propertyType: 'casa',
        province: 'Holguín',
        municipality: 'Holguín',
        minBedrooms: 3.9,
        minAreaM2: 90,
        notes: '  Planta baja  ',
        cashAdjustment: { direction: 'receive', amountUsd: 5000 },
      },
    })).toEqual({
      propertyType: 'casa',
      province: 'Holguín',
      municipality: 'Holguín',
      minBedrooms: 3,
      minAreaM2: '90',
      notes: 'Planta baja',
      cashAdjustment: 'receive',
      cashAmountUsd: '5000',
    })
  })

  it('formats the visible exchange summary without losing the cash direction', () => {
    expect(getExchangePropertyTypeLabel('indiferente')).toBe('Cualquier tipo')
    expect(formatExchangeCashAdjustment({
      propertyType: 'apartamento',
      cashAdjustment: { direction: 'receive', amountUsd: 5000 },
    })).toBe('Espera recibir hasta USD 5,000')
    expect(formatExchangeCashAdjustment({
      propertyType: 'apartamento',
      cashAdjustment: { direction: 'negotiable' },
    })).toBe('Diferencia de dinero negociable')
  })
})
