export const MATERIAL_PHOTO_BUCKET = 'material-listings'
export const MATERIAL_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const MATERIAL_PHOTO_MAX_COUNT = 10

const MATERIAL_PHOTO_MIME_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const MATERIAL_PHOTO_PATH_PATTERN = new RegExp(`^${UUID_PATTERN}/${UUID_PATTERN}/${UUID_PATTERN}\\.(?:webp|jpe?g|png)$`, 'i')

export function isMaterialPhotoPath(value: string): boolean {
  return MATERIAL_PHOTO_PATH_PATTERN.test(value)
}

export function isMaterialPhotoReference(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (isMaterialPhotoPath(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function validateMaterialPhotoFiles(files: readonly File[], existingCount: number): string | null {
  if (existingCount + files.length > MATERIAL_PHOTO_MAX_COUNT) return 'TOO_MANY'
  if (files.some((file) => !MATERIAL_PHOTO_MIME_TYPES.has(file.type))) return 'INVALID_TYPE'
  if (files.some((file) => file.size > MATERIAL_PHOTO_MAX_BYTES)) return 'TOO_LARGE'
  return null
}

export function materialPhotoExtension(file: File): string | null {
  switch (file.type) {
    case 'image/webp': return 'webp'
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    default: return null
  }
}
