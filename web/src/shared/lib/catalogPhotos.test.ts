import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compressCatalogPhoto, validateCatalogPhotoFiles } from './catalogPhotos'

vi.mock('./compressImageFile', () => ({
  compressImageFileToWebP: vi.fn(async (file: File) => new File([file], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })),
}))

describe('catalog photo flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates multiple photos together with the existing image count', () => {
    const files = Array.from({ length: 3 }, (_, index) => new File(['x'], `${index}.jpg`, { type: 'image/jpeg' }))
    expect(validateCatalogPhotoFiles(files, 8)).toBe('TOO_MANY')
    expect(validateCatalogPhotoFiles(files, 7)).toBeNull()
    expect(validateCatalogPhotoFiles([new File(['x'], 'bad.svg', { type: 'image/svg+xml' })], 0)).toBe('INVALID_TYPE')
    expect(validateCatalogPhotoFiles([new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })], 0)).toBe('TOO_LARGE')
  })

  it('compresses selected photos to WebP using the property catalog dimensions and quality', async () => {
    const { compressImageFileToWebP } = await import('./compressImageFile')
    const result = await compressCatalogPhoto(new File(['photo'], 'cement.jpg', { type: 'image/jpeg' }))
    expect(vi.mocked(compressImageFileToWebP)).toHaveBeenCalledWith(expect.any(File), {
      maxWidth: 800, maxHeight: 800, maxPixels: 40_000_000, quality: 0.7,
    })
    expect(result.name).toBe('cement.webp')
    expect(result.type).toBe('image/webp')
  })

  it('rejects images above the decompressed pixel limit', async () => {
    const { compressImageFileToWebP } = await import('./compressImageFile')
    vi.mocked(compressImageFileToWebP).mockRejectedValueOnce(new Error('IMAGE_DIMENSIONS_TOO_LARGE'))
    await expect(compressCatalogPhoto(new File(['photo'], 'large.webp', { type: 'image/webp' })))
      .rejects.toThrow('IMAGE_DIMENSIONS_TOO_LARGE')
  })
})
