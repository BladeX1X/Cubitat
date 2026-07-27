const MAX_KYC_IMAGE_SIDE = 1600
const KYC_WEBP_QUALITY = 0.82

export function getKycImageTargetSize(
  width: number,
  height: number,
  maxSide = MAX_KYC_IMAGE_SIDE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxSide <= 0) {
    throw new Error('Las dimensiones de la imagen no son válidas.')
  }

  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export function buildKycWebPName(originalName: string): string {
  const extensionIndex = originalName.lastIndexOf('.')
  const baseName = extensionIndex > 0 ? originalName.slice(0, extensionIndex) : originalName
  return `${baseName || 'evidencia-kyc'}.webp`
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('No se pudo interpretar la imagen.'))
      image.onload = () => resolve(image)
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export async function compressKycImageToWebP(file: File): Promise<File> {
  const image = await readImage(file)
  const target = getKycImageTargetSize(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la compresión de la imagen.')
  context.drawImage(image, 0, 0, target.width, target.height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('No se pudo convertir la imagen a WebP.')),
      'image/webp',
      KYC_WEBP_QUALITY,
    )
  })

  return new File([blob], buildKycWebPName(file.name), {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}
