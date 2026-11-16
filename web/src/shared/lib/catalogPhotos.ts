import { compressImageFileToWebP } from './compressImageFile'

export const CATALOG_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const CATALOG_PHOTO_MAX_COUNT = 10
const MAX_IMAGE_PIXELS = 40_000_000
const ALLOWED_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])

export function validateCatalogPhotoFiles(files: readonly File[], existingCount: number): string | null {
  if (existingCount + files.length > CATALOG_PHOTO_MAX_COUNT) return 'TOO_MANY'
  if (files.some((file) => !ALLOWED_TYPES.has(file.type))) return 'INVALID_TYPE'
  if (files.some((file) => file.size <= 0 || file.size > CATALOG_PHOTO_MAX_BYTES)) return 'TOO_LARGE'
  return null
}

export async function compressCatalogPhoto(file: File): Promise<File> {
  const validationError = validateCatalogPhotoFiles([file], 0)
  if (validationError) throw new Error(`CATALOG_PHOTO_${validationError}`)
  try {
    const compressed = await compressImageFileToWebP(file, {
      maxWidth: 800,
      maxHeight: 800,
      maxPixels: MAX_IMAGE_PIXELS,
      quality: 0.7,
    })
    if (compressed.size > CATALOG_PHOTO_MAX_BYTES) throw new Error('CATALOG_PHOTO_TOO_LARGE')
    return compressed
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CATALOG_PHOTO_')) throw error
    throw new Error(error instanceof Error && error.message === 'IMAGE_DIMENSIONS_TOO_LARGE'
      ? error.message
      : 'CATALOG_PHOTO_COMPRESSION_FAILED')
  }
}
