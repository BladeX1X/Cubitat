import { describe, expect, it } from 'vitest'
import { dataUrlToBlob } from './imageDataUrl'
import { formatCubanPhoneForDisplay, getCubanLocalPhone, normalizeCubanPhoneForStorage, validatePhone } from './phone'

describe('Cuban phone validation for publication', () => {
  it.each(['51234567', '+53 51234567', '0053 51234567'])('accepts valid Cuban mobile %s', (phone) => {
    expect(validatePhone(phone)).toBe(true)
  })

  it.each(['', '123', '+1 555 123 4567', '61234567'])('rejects invalid contact number %s', (phone) => {
    expect(validatePhone(phone)).toBe(false)
  })

  it('extracts the local number without duplicating country code', () => {
    expect(getCubanLocalPhone('+53 51234567')).toBe('51234567')
    expect(getCubanLocalPhone('0053-51234567')).toBe('51234567')
  })

  it('normalizes valid input for storage and display', () => {
    expect(normalizeCubanPhoneForStorage('5123 4567')).toBe('+5351234567')
    expect(formatCubanPhoneForDisplay('+5351234567')).toBe('+53 51234567')
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
