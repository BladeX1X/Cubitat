import { describe, expect, it } from 'vitest'
import { getPropertyCoverImage, normalizePropertyImages, normalizePropertyImageReference, PROPERTY_IMAGE_FALLBACK } from './images'

describe('getPropertyCoverImage', () => {
  it('conserva una portada real', () => {
    expect(getPropertyCoverImage('https://example.com/casa.webp')).toBe('https://example.com/casa.webp')
  })

  it('usa el proxy de la aplicación para servir fotos del bucket privado', () => {
    const owner = '11111111-1111-4111-8111-111111111111'
    const filename = '22222222-2222-4222-8222-222222222222.webp'
    const publicUrl = `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${owner}/${filename}`
    const directUrl = `https://example.supabase.co/storage/v1/object/public/property_images/${owner}/${filename}`
    const expected = `${window.location.origin}/api/supabase/storage/v1/object/property_images/${owner}/${filename}`

    expect(normalizePropertyImageReference(publicUrl)).toBe(expected)
    expect(getPropertyCoverImage(directUrl)).toBe(expected)
    expect(normalizePropertyImages([publicUrl])).toEqual([expected])
  })

  it('deja intactas imágenes externas y URLs firmadas', () => {
    const external = 'https://images.example.com/casa.webp'
    const signed = 'https://example.supabase.co/storage/v1/object/public/property_images/owner/photo.webp?token=private'
    expect(normalizePropertyImageReference(external)).toBe(external)
    expect(normalizePropertyImageReference(signed)).toBe(signed)
  })

  it('usa el fallback local inmediato cuando no existe portada', () => {
    expect(getPropertyCoverImage(null)).toBe(PROPERTY_IMAGE_FALLBACK)
    expect(getPropertyCoverImage('   ')).toBe(PROPERTY_IMAGE_FALLBACK)
  })
})
