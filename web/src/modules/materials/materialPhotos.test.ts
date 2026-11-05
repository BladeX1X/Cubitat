import { describe, expect, it } from 'vitest'
import { isMaterialPhotoPath, isMaterialPhotoReference, materialPhotoExtension, validateMaterialPhotoFiles } from './materialPhotos'

describe('material photo references', () => {
  it('accepts only UUID-scoped storage paths and grandfathered HTTPS references', () => {
    const path = 'de305d54-75b4-431b-adb2-eb6b9e546014/7c9e6679-7425-40de-944b-e07fc1f90ae7/550e8400-e29b-41d4-a716-446655440000.webp'
    expect(isMaterialPhotoPath(path)).toBe(true)
    expect(isMaterialPhotoPath('../owner/image.webp')).toBe(false)
    expect(isMaterialPhotoReference(path)).toBe(true)
    expect(isMaterialPhotoReference('https://legacy.example/photo.jpg')).toBe(true)
    expect(isMaterialPhotoReference('http://legacy.example/photo.jpg')).toBe(false)
  })

  it('enforces a ten-photo limit and approved MIME types and size', () => {
    const makeFile = (name: string, size: number, type: string) => new File([new Uint8Array(size)], name, { type })
    expect(validateMaterialPhotoFiles([makeFile('photo.webp', 10, 'image/webp')], 10)).toBe('TOO_MANY')
    expect(validateMaterialPhotoFiles([makeFile('photo.svg', 10, 'image/svg+xml')], 0)).toBe('INVALID_TYPE')
    expect(validateMaterialPhotoFiles([makeFile('photo.webp', 5 * 1024 * 1024 + 1, 'image/webp')], 0)).toBe('TOO_LARGE')
    expect(validateMaterialPhotoFiles([makeFile('photo.webp', 5 * 1024 * 1024, 'image/webp')], 0)).toBeNull()
  })

  it('maps supported MIME types to safe file extensions', () => {
    expect(materialPhotoExtension(new File(['x'], 'input', { type: 'image/jpeg' }))).toBe('jpg')
    expect(materialPhotoExtension(new File(['x'], 'input', { type: 'image/png' }))).toBe('png')
    expect(materialPhotoExtension(new File(['x'], 'input', { type: 'image/svg+xml' }))).toBeNull()
  })
})
