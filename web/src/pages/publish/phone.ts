const INTERNATIONAL_PHONE_PATTERN = /^\+?[0-9\s().-]+$/

export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function validatePhone(phone: string): boolean {
  const trimmed = phone.trim()
  if (!trimmed || !INTERNATIONAL_PHONE_PATTERN.test(trimmed)) return false

  const digits = getPhoneDigits(trimmed)
  return digits.length >= 7 && digits.length <= 15
}

export function normalizePhoneForStorage(phone: string): string {
  const trimmed = phone.trim()
  const digits = getPhoneDigits(trimmed)
  if (!digits) return ''

  if (trimmed.startsWith('+')) return `+${digits}`
  if (trimmed.startsWith('00')) return `+${digits.slice(2)}`
  return digits
}

export function formatPhoneForDisplay(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, ' ')
  return trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed
}
