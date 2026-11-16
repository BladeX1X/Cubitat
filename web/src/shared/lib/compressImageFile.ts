export type ImageCompressionOptions = {
  maxWidth: number
  maxHeight: number
  quality: number
  maxPixels?: number
}

export async function compressImageFileToWebP(file: File, options: ImageCompressionOptions): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    if (options.maxPixels && bitmap.width * bitmap.height > options.maxPixels) {
      throw new Error('IMAGE_DIMENSIONS_TOO_LARGE')
    }
    const scale = Math.min(1, options.maxWidth / bitmap.width, options.maxHeight / bitmap.height)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('IMAGE_COMPRESSION_FAILED')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result || result.type !== 'image/webp') {
          reject(new Error('IMAGE_COMPRESSION_FAILED'))
          return
        }
        resolve(result)
      }, 'image/webp', options.quality)
    })

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}
