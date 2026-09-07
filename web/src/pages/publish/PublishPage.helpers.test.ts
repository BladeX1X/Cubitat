import { describe, expect, it } from 'vitest'
import { dataUrlToBlob } from './imageDataUrl'
import { formatPhoneForDisplay, getPhoneDigits, normalizePhoneForStorage, validatePhone } from './phone'

describe('international phone validation for publication', () => {
  it.each([
    '+53 51234567',
    '+52 55 1234 5678',
    '+1 (555) 123-4567',
    '0034 612 345 678',
    '7123456',
  ])('accepts a valid phone from any country: %s', (phone) => {
    expect(validatePhone(phone)).toBe(true)
  })

  it.each(['', '123', '+12 abc 4567', '++52 5512345678', '+1234567890123456'])('rejects invalid contact number %s', (phone) => {
    expect(validatePhone(phone)).toBe(false)
  })

  it('extracts digits without assuming a country', () => {
    expect(getPhoneDigits('+53 51234567')).toBe('5351234567')
    expect(getPhoneDigits('+52 (55) 1234-5678')).toBe('525512345678')
  })

  it('normalizes international prefixes without forcing +53', () => {
    expect(normalizePhoneForStorage('+52 (55) 1234-5678')).toBe('+525512345678')
    expect(normalizePhoneForStorage('0034 612 345 678')).toBe('+34612345678')
    expect(normalizePhoneForStorage('7123 456')).toBe('7123456')
  })

  it('preserves a readable international display value', () => {
    expect(formatPhoneForDisplay('  +52   (55) 1234-5678  ')).toBe('+52 (55) 1234-5678')
    expect(formatPhoneForDisplay('0034 612 345 678')).toBe('+34 612 345 678')
  })
})

describe('publication image data URLs', () => {
  it('converts base64 data URLs to blobs without network fetch', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (() => {
      throw new Error('fetch should not be called for data URLs')
    }) as typeof fetch

    try {
      const blob = dataUrlToBlob('data:image/webp;base64,ZmFrZS13ZWJw')
      expect(blob.type).toBe('image/webp')
      await expect(blob.text()).resolves.toBe('fake-webp')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
