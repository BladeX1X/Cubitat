import { CATALOG_PHOTO_MAX_BYTES, CATALOG_PHOTO_MAX_COUNT, compressCatalogPhoto, validateCatalogPhotoFiles } from '../../shared/lib/catalogPhotos'
import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

export const HOME_SERVICE_PHOTO_BUCKET = 'home-service-photos'
export const HOME_SERVICE_LEGACY_PHOTO_BUCKET = 'home-service-profiles'
export const HOME_SERVICE_PHOTO_MAX_BYTES = CATALOG_PHOTO_MAX_BYTES
export const HOME_SERVICE_PHOTO_MAX_COUNT = CATALOG_PHOTO_MAX_COUNT
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PATH = new RegExp(`^${UUID}/${UUID}\\.webp$`, 'i')
const LEGACY_PATH = new RegExp(`^${UUID}/${UUID}/${UUID}\\.(webp|jpe?g|png)$`, 'i')

export const compressHomeServicePhoto = compressCatalogPhoto

export function getHomeServicePhotoBucket(value: string): typeof HOME_SERVICE_PHOTO_BUCKET | typeof HOME_SERVICE_LEGACY_PHOTO_BUCKET | null {
  if (PATH.test(value)) return HOME_SERVICE_PHOTO_BUCKET
  if (LEGACY_PATH.test(value)) return HOME_SERVICE_LEGACY_PHOTO_BUCKET
  return null
}

export function isHomeServicePhotoPath(value: string): boolean {
  return getHomeServicePhotoBucket(value) !== null
}

export function validateHomeServicePhotoFiles(files: readonly File[], existingCount: number): string | null {
  return validateCatalogPhotoFiles(files, existingCount)
}

export async function uploadHomeServicePhotos(files: readonly File[], existingCount = 0): Promise<string[]> {
  const validation = validateHomeServicePhotoFiles(files, existingCount)
  if (validation) throw new Error(`HOME_SERVICE_PHOTO_${validation}`)
  if (files.some((file) => file.type !== 'image/webp')) throw new Error('HOME_SERVICE_PHOTO_NOT_COMPRESSED')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('AUTH_REQUIRED')
  const uploadedPaths: string[] = []
  try {
    for (const file of files) {
      const path = `${user.id}/${crypto.randomUUID()}.webp`
      const { error } = await supabase.storage.from(HOME_SERVICE_PHOTO_BUCKET).upload(path, file, {
        cacheControl: '3600', contentType: 'image/webp', upsert: false,
      })
      if (error) throw error
      uploadedPaths.push(path)
    }
    return uploadedPaths
  } catch (error) {
    await removeUnattachedHomeServicePhotos(uploadedPaths)
    logSafeEvent({ module: 'home_services', action: 'upload_provider_photos', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error(error instanceof Error && error.message.startsWith('HOME_SERVICE_PHOTO_')
      ? error.message
      : 'HOME_SERVICE_PHOTO_UPLOAD_FAILED')
  }
}

export async function removeUnattachedHomeServicePhotos(paths: readonly string[]): Promise<void> {
  const pathsByBucket = new Map<typeof HOME_SERVICE_PHOTO_BUCKET | typeof HOME_SERVICE_LEGACY_PHOTO_BUCKET, string[]>()
  for (const path of paths) {
    const bucket = getHomeServicePhotoBucket(path)
    if (!bucket) continue
    const bucketPaths = pathsByBucket.get(bucket) ?? []
    bucketPaths.push(path)
    pathsByBucket.set(bucket, bucketPaths)
  }

  for (const [bucket, bucketPaths] of pathsByBucket) {
    try {
      const { error } = await supabase.storage.from(bucket).remove(bucketPaths)
      if (error) logSafeEvent({ module: 'home_services', action: 'cleanup_unattached_provider_photos', level: 'warn', code: sanitizeErrorReason(error) })
    } catch (error) {
      logSafeEvent({ module: 'home_services', action: 'cleanup_unattached_provider_photos', level: 'warn', code: sanitizeErrorReason(error) })
    }
  }
}
