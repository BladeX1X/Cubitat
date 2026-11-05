export type MarketplaceListingType = 'service' | 'material'

export type MarketplaceContact = {
  phone: string | null
  whatsapp: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function fetchMarketplaceContact(
  listingType: MarketplaceListingType,
  listingId: string,
  turnstileToken: string,
): Promise<MarketplaceContact> {
  const response = await fetch('/api/public/marketplace-contact', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_type: listingType, listing_id: listingId, turnstile_token: turnstileToken }),
  })
  if (!response.ok) throw new Error('MARKETPLACE_CONTACT_FAILED')
  const value: unknown = await response.json()
  if (!isRecord(value)) throw new Error('MARKETPLACE_CONTACT_FAILED')
  const phone = typeof value.phone === 'string' ? value.phone : null
  const whatsapp = typeof value.whatsapp === 'string' ? value.whatsapp : null
  const isPhone = (candidate: string | null) => candidate === null
    || (/^\+?[0-9 ()-]{6,24}$/.test(candidate) && candidate.replace(/\D/g, '').length >= 7 && candidate.replace(/\D/g, '').length <= 15)
  if ((!phone && !whatsapp) || !isPhone(phone) || !isPhone(whatsapp)) {
    throw new Error('MARKETPLACE_CONTACT_FAILED')
  }
  return { phone, whatsapp }
}
