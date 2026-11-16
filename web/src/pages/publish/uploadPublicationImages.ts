import { dataUrlToBlob } from './imageDataUrl'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import { isOwnedPropertyImageReference } from '../../modules/properties/utils/privateImagePreviews'
import { normalizePropertyImageReference } from '../../modules/properties/utils/images'

type ImageStorage = {
  getPublicUrl: (path: string) => { data: { publicUrl: string } }
  remove: (paths: string[]) => PromiseLike<{ error: unknown }>
}
type UploadImage = (blob: Blob) => Promise<string>

/** A failed batch never reaches the property write; existing URLs are never deleted. */
export async function uploadPublicationImages(
  userId: string,
  images: ReadonlyArray<{ dataUrl: string }>,
  storage: ImageStorage,
  uploadImage: UploadImage,
): Promise<string[]> {
  const createdPaths: string[] = []
  const urls: string[] = []
  try {
    for (const image of images) {
      const isPropertyImageReference = /\/storage\/v1\/object\/(?:public\/)?property_images\//i.test(image.dataUrl)
      if (isPropertyImageReference) {
        if (!isOwnedPropertyImageReference(image.dataUrl, userId)) throw new Error('unowned_property_image_reference')
        urls.push(normalizePropertyImageReference(image.dataUrl))
        continue
      }
      if (image.dataUrl.startsWith('https://') || image.dataUrl.startsWith('http://')) {
        urls.push(image.dataUrl)
        continue
      }
      const path = await uploadImage(dataUrlToBlob(image.dataUrl))
      if (!path.startsWith(`${userId}/`)) throw new Error('invalid_property_image_owner_path')
      createdPaths.push(path)
      const url = normalizePropertyImageReference(storage.getPublicUrl(path).data.publicUrl)
      if (!url) throw new Error('missing_image_url')
      urls.push(url)
    }
    return urls
  } catch (error) {
    if (createdPaths.length) {
      try {
        const { error: cleanupError } = await storage.remove(createdPaths)
        if (cleanupError) throw cleanupError
      } catch (cleanupError) {
        logSafeEvent({ module: 'publish', action: 'cleanup_failed_image_batch', level: 'warn', code: sanitizeErrorReason(cleanupError) })
      }
    }
    logSafeEvent({ module: 'publish', action: 'upload_image_batch', level: 'error', code: sanitizeErrorReason(error) })
    throw new Error('No se subieron todas las fotos. Tus datos y fotos se conservan para reintentar.')
  }
}
