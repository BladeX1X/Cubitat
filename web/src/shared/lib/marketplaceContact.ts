export type MarketplaceListingType = 'property' | 'service' | 'material'

export type MarketplaceContact = {
  phone: string | null
  whatsapp: string | null
}

export class MarketplaceContactError extends Error {
  readonly reason: 'missing' | 'unavailable' | 'rate-limited'
  readonly retryAfterSeconds?: number

  constructor(reason: 'missing' | 'unavailable' | 'rate-limited', retryAfterSeconds?: number) {
    super(reason === 'missing' ? 'MARKETPLACE_CONTACT_MISSING' : 'MARKETPLACE_CONTACT_FAILED')
    this.name = 'MarketplaceContactError'
    this.reason = reason
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function fetchMarketplaceContact(
  listingType: MarketplaceListingType,
  listingId: string,
): Promise<MarketplaceContact> {
  const isProperty = listingType === 'property'
  const response = await fetch(isProperty ? '/api/public/property-contact' : '/api/public/marketplace-contact', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isProperty
      ? { property_id: listingId }
      : { listing_type: listingType, listing_id: listingId }),
  })
  if (!response.ok) {
    if (response.status === 404) throw new MarketplaceContactError('missing')
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'))
      throw new MarketplaceContactError(
        'rate-limited',
        Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined,
      )
    }
    throw new MarketplaceContactError('unavailable')
  }
  const value: unknown = await response.json()
  if (!isRecord(value)) throw new MarketplaceContactError('unavailable')
  const phone = typeof value.phone === 'string' ? value.phone : null
  const whatsapp = typeof value.whatsapp === 'string' ? value.whatsapp : null
  const isPhone = (candidate: string | null) => candidate === null
    || (/^\+?[0-9 ()-]{6,24}$/.test(candidate) && candidate.replace(/\D/g, '').length >= 7 && candidate.replace(/\D/g, '').length <= 15)
  if ((!phone && !whatsapp) || !isPhone(phone) || !isPhone(whatsapp)) {
    throw new MarketplaceContactError('unavailable')
  }
  return { phone, whatsapp }
}

export function getMarketplaceContactUrl(
  channel: 'phone' | 'whatsapp',
  phone: string,
  title: string,
  location: string,
): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  if (channel === 'phone') return `tel:${phone.trim().startsWith('+') ? `+${digits}` : digits}`
  const titleText = title.trim().slice(0, 200)
  const locationText = location.trim().slice(0, 120)
  const place = locationText ? ` en ${locationText}` : ''
  const message = `Hola, estoy interesado en "${titleText}"${place}. Quisiera recibir más detalles.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
