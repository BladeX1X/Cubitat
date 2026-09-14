import {
  PROPERTY_TYPE_VALUES,
  propertyTypeLabels,
  type CanonicalPropertyType,
} from '../../shared/lib/propertyTaxonomy'

export type ExchangePropertyType = CanonicalPropertyType | 'indiferente'
export type ExchangeCashDirection = 'none' | 'pay' | 'receive' | 'negotiable'

export type ExchangePreferences = {
  propertyType: ExchangePropertyType
  province?: string
  municipality?: string
  minBedrooms?: number
  minAreaM2?: number
  notes?: string
  cashAdjustment: { direction: ExchangeCashDirection; amountUsd?: number }
}

export type ExchangePreferencesForm = {
  propertyType: ExchangePropertyType | ''
  province: string
  municipality: string
  minBedrooms: number
  minAreaM2: string
  notes: string
  cashAdjustment: ExchangeCashDirection
  cashAmountUsd: string
}

export const emptyExchangePreferencesForm: ExchangePreferencesForm = {
  propertyType: '', province: '', municipality: '', minBedrooms: 0,
  minAreaM2: '', notes: '', cashAdjustment: 'none', cashAmountUsd: '',
}

const exchangePropertyTypes = new Set<string>(['indiferente', ...PROPERTY_TYPE_VALUES])
const cashDirections = new Set<string>(['none', 'pay', 'receive', 'negotiable'])

function optionalPositiveNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function buildExchangePreferences(form: ExchangePreferencesForm): ExchangePreferences | null {
  if (!form.propertyType) return null
  const minAreaM2 = optionalPositiveNumber(form.minAreaM2)
  const amountUsd = optionalPositiveNumber(form.cashAmountUsd)
  const requiresAmount = form.cashAdjustment === 'pay' || form.cashAdjustment === 'receive'
  return {
    propertyType: form.propertyType,
    ...(form.province ? { province: form.province } : {}),
    ...(form.municipality ? { municipality: form.municipality } : {}),
    ...(form.minBedrooms > 0 ? { minBedrooms: Math.floor(form.minBedrooms) } : {}),
    ...(minAreaM2 ? { minAreaM2 } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    cashAdjustment: {
      direction: form.cashAdjustment,
      ...(requiresAmount && amountUsd ? { amountUsd } : {}),
    },
  }
}

export function isExchangePreferencesFormValid(form: ExchangePreferencesForm): boolean {
  if (!form.propertyType) return false
  if (form.minAreaM2 && !optionalPositiveNumber(form.minAreaM2)) return false
  return !((form.cashAdjustment === 'pay' || form.cashAdjustment === 'receive') && !optionalPositiveNumber(form.cashAmountUsd))
}

export function getExchangePreferences(features: Record<string, unknown> | null | undefined): ExchangePreferences | null {
  const raw = features?.exchangePreferences
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Record<string, unknown>
  if (typeof candidate.propertyType !== 'string' || !exchangePropertyTypes.has(candidate.propertyType)) return null
  const cash = candidate.cashAdjustment
  const cashRecord = cash && typeof cash === 'object' && !Array.isArray(cash) ? cash as Record<string, unknown> : {}
  const direction = typeof cashRecord.direction === 'string' && cashDirections.has(cashRecord.direction)
    ? cashRecord.direction as ExchangeCashDirection : 'none'
  const amountUsd = optionalPositiveNumber(cashRecord.amountUsd)
  const minBedrooms = optionalPositiveNumber(candidate.minBedrooms)
  const minAreaM2 = optionalPositiveNumber(candidate.minAreaM2)
  return {
    propertyType: candidate.propertyType as ExchangePropertyType,
    ...(typeof candidate.province === 'string' && candidate.province ? { province: candidate.province } : {}),
    ...(typeof candidate.municipality === 'string' && candidate.municipality ? { municipality: candidate.municipality } : {}),
    ...(minBedrooms ? { minBedrooms: Math.floor(minBedrooms) } : {}),
    ...(minAreaM2 ? { minAreaM2 } : {}),
    ...(typeof candidate.notes === 'string' && candidate.notes.trim() ? { notes: candidate.notes.trim() } : {}),
    cashAdjustment: {
      direction,
      ...((direction === 'pay' || direction === 'receive') && amountUsd ? { amountUsd } : {}),
    },
  }
}

export function exchangePreferencesToForm(features: Record<string, unknown> | null | undefined): ExchangePreferencesForm {
  const preferences = getExchangePreferences(features)
  if (!preferences) return { ...emptyExchangePreferencesForm }
  return {
    propertyType: preferences.propertyType,
    province: preferences.province ?? '',
    municipality: preferences.municipality ?? '',
    minBedrooms: preferences.minBedrooms ?? 0,
    minAreaM2: preferences.minAreaM2 ? String(preferences.minAreaM2) : '',
    notes: preferences.notes ?? '',
    cashAdjustment: preferences.cashAdjustment.direction,
    cashAmountUsd: preferences.cashAdjustment.amountUsd ? String(preferences.cashAdjustment.amountUsd) : '',
  }
}

export function getExchangePropertyTypeLabel(type: ExchangePropertyType): string {
  return type === 'indiferente' ? 'Cualquier tipo' : propertyTypeLabels[type].publish
}

export function formatExchangeCashAdjustment(preferences: ExchangePreferences): string {
  const amount = preferences.cashAdjustment.amountUsd
  const formattedAmount = amount ? `USD ${new Intl.NumberFormat('en-US').format(amount)}` : ''
  switch (preferences.cashAdjustment.direction) {
    case 'pay': return amount ? `Puede pagar hasta ${formattedAmount}` : 'Puede aportar dinero adicional'
    case 'receive': return amount ? `Espera recibir hasta ${formattedAmount}` : 'Espera recibir dinero adicional'
    case 'negotiable': return 'Diferencia de dinero negociable'
    default: return 'Sin diferencia de dinero'
  }
}
