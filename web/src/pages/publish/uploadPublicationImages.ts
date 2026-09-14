import { dataUrlToBlob } from './imageDataUrl'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

type ImageStorage = {
  upload: (path: string, blob: Blob, options: { contentType: string }) => PromiseLike<{ error: unknown }>
  getPublicUrl: (path: string) => { data: { publicUrl: string } }
  remove: (paths: string[]) => PromiseLike<{ error: unknown }>
}

/** A failed batch never reaches the property write; existing URLs are never deleted. */
export async function uploadPublicationImages(
  userId: string,
  images: ReadonlyArray<{ dataUrl: string }>,
  storage: ImageStorage,
): Promise<string[]> {
  const createdPaths: string[] = []
  const urls: string[] = []
  try {
    for (const image of images) {
      if (image.dataUrl.startsWith('https://') || image.dataUrl.startsWith('http://')) {
        urls.push(image.dataUrl)
        continue
      }
      const path = `${userId}/${crypto.randomUUID()}.webp`
      const { error } = await storage.upload(path, dataUrlToBlob(image.dataUrl), { contentType: 'image/webp' })
      if (error) throw error
      createdPaths.push(path)
      const url = storage.getPublicUrl(path).data.publicUrl
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
