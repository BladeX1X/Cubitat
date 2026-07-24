import { describe, expect, it } from 'vitest'
import { getPropertyCoverImage, PROPERTY_IMAGE_FALLBACK } from './images'

describe('getPropertyCoverImage', () => {
  it('conserva una portada real', () => {
    expect(getPropertyCoverImage('https://example.com/casa.webp')).toBe('https://example.com/casa.webp')
  })

  it('usa el fallback local inmediato cuando no existe portada', () => {
    expect(getPropertyCoverImage(null)).toBe(PROPERTY_IMAGE_FALLBACK)
    expect(getPropertyCoverImage('   ')).toBe(PROPERTY_IMAGE_FALLBACK)
  })
})
