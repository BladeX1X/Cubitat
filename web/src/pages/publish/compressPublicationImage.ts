import {
  PROPERTY_IMAGE_RULES,
  validateImageDimensions,
  validateImageFile,
} from '../../shared/lib/imageSecurity'

/** Compresses a validated property photo to a bandwidth-friendly WebP. */
export async function compressPublicationImage(file: File): Promise<{ dataUrl: string; size: number }> {
  const fileValidationError = validateImageFile(file, PROPERTY_IMAGE_RULES)
  if (fileValidationError) throw new Error(fileValidationError)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const image = new Image()
      image.onload = () => {
        try {
          const dimensionError = validateImageDimensions(image.width, image.height, PROPERTY_IMAGE_RULES)
          if (dimensionError) {
            reject(new Error(dimensionError))
            return
          }
          const canvas = document.createElement('canvas')
          let width = image.width
          let height = image.height
          const maxWidth = 800
          const maxHeight = 800
          if (width > height && width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          } else if (height >= width && height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }

          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')
          if (!context) {
            reject(new Error('No se pudo obtener el contexto 2D del canvas para compresión.'))
            return
          }
          context.drawImage(image, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/webp', 0.70)
          resolve({ dataUrl, size: Math.round((dataUrl.length - 22) * 3 / 4) })
        } catch (error) {
          reject(error || new Error('Fallo durante el procesamiento del canvas.'))
        }
      }
      image.onerror = () => reject(new Error('Error al cargar la imagen.'))
      image.src = event.target?.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
