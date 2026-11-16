import { isMaterialPhotoPath } from './materialPhotos'

/** Sends one optimized photo to the authenticated DEV upload gateway. */
export async function uploadMaterialPhoto(
  file: File,
  ownerId: string,
  listingId: string,
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  if (!accessToken) throw new Error('AUTH_REQUIRED')
  if (file.type !== 'image/webp') throw new Error('MATERIAL_PHOTO_INVALID_TYPE')
  const response = await fetchFn(`/api/material-photos/${encodeURIComponent(listingId)}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'image/webp',
    },
    body: file,
  })
  if (!response.ok) throw new Error('MATERIAL_PHOTO_UPLOAD_FAILED')

  const result: unknown = await response.json()
  if (!result || typeof result !== 'object' || !('path' in result) || typeof result.path !== 'string'
    || !isMaterialPhotoPath(result.path)) {
    throw new Error('MATERIAL_PHOTO_UPLOAD_FAILED')
  }
  const [photoOwnerId, photoListingId] = result.path.split('/')
  if (photoOwnerId?.toLowerCase() !== ownerId.toLowerCase() || photoListingId !== listingId) {
    throw new Error('MATERIAL_PHOTO_UPLOAD_FAILED')
  }
  return result.path
}
