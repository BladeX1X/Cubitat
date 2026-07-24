export type ImageUploadRules = {
  allowedMimeTypes: readonly string[]
  maxInputBytes: number
  maxPixels: number
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const PROPERTY_IMAGE_RULES: ImageUploadRules = {
  allowedMimeTypes: SUPPORTED_IMAGE_TYPES,
  maxInputBytes: 10 * 1024 * 1024,
  maxPixels: 40_000_000,
}

export const AVATAR_IMAGE_RULES: ImageUploadRules = {
  allowedMimeTypes: SUPPORTED_IMAGE_TYPES,
  maxInputBytes: 5 * 1024 * 1024,
  maxPixels: 20_000_000,
}

export function validateImageFile(file: File, rules: ImageUploadRules): string | null {
  if (!rules.allowedMimeTypes.includes(file.type)) {
    return 'Formato no admitido. Usa una imagen JPG, PNG o WebP.'
  }

  if (file.size <= 0 || file.size > rules.maxInputBytes) {
    const maxMegabytes = Math.floor(rules.maxInputBytes / (1024 * 1024))
    return `La imagen debe pesar como máximo ${maxMegabytes} MB.`
  }

  return null
}

export function validateImageDimensions(
  width: number,
  height: number,
  rules: ImageUploadRules,
): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'La imagen no tiene dimensiones válidas.'
  }

  if (width * height > rules.maxPixels) {
    return 'La resolución de la imagen es demasiado grande para procesarla de forma segura.'
  }

  return null
}
