import { normalizePhoneForStorage, validatePhone } from '../../../shared/lib/phone'
import { publicPropertyLocation } from '../../../shared/lib/propertyLocation'
import type { Property } from '../types'

type PropertyContactInfo = {
  name?: string
  phone?: string
  email?: string
} | null | undefined

const demoContactInfoById: Record<string, NonNullable<PropertyContactInfo>> = {
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d': {
    name: 'Equipo Cubitat',
    phone: '+5355510101',
  },
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e': {
    name: 'Equipo Cubitat',
    phone: '+5355510102',
  },
  'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f': {
    name: 'Equipo Cubitat',
    phone: '+5355510103',
  },
  'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a': {
    name: 'Equipo Cubitat',
    phone: '+5355510104',
  },
  'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b': {
    name: 'Equipo Cubitat',
    phone: '+5355510105',
  },
  'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c': {
    name: 'Equipo Cubitat',
    phone: '+5355510106',
  },
  'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d': {
    name: 'Equipo Cubitat',
    phone: '+5355510107',
  },
  'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e': {
    name: 'Equipo Cubitat',
    phone: '+5355510108',
  },
}

export function normalizePhoneForTel(phone: string): string {
  const normalized = normalizePhoneForStorage(phone)
  if (normalized.startsWith('+')) return normalized
  if (/^5\d{7}$/.test(normalized)) return `+53${normalized}`
  return normalized
}

export function normalizePhoneForWhatsApp(phone: string): string {
  return normalizePhoneForTel(phone).replace('+', '')
}

export function getPropertyContactChannelUrl(
  channel: 'phone' | 'whatsapp',
  phone: string,
  property: Pick<Property, 'title' | 'location'>,
): string | null {
  if (!validatePhone(phone)) return null

  if (channel === 'phone') {
    return `tel:${normalizePhoneForTel(phone)}`
  }

  const location = publicPropertyLocation(property.location)
  const locationText = location ? ` en ${location}` : ''
  const message = `Hola, estoy interesado en "${property.title}"${locationText}. Quisiera recibir más detalles.`
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`
}

export function getPropertyContactInfo(
  propertyId: string,
  contactInfo: PropertyContactInfo,
): PropertyContactInfo {
  if (contactInfo?.phone) {
    return contactInfo
  }

  return demoContactInfoById[propertyId] ?? contactInfo ?? null
}
