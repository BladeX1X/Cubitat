const PROPERTY_IMAGE_PATH_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp)$/i

/** Uploads one optimized image through the authenticated Worker gateway. */
export async function uploadPropertyImage(image: Blob, accessToken: string): Promise<string> {
  if (!accessToken) throw new Error('PROPERTY_IMAGE_SESSION_REQUIRED')
  const response = await fetch('/api/property-images/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'image/webp',
    },
    body: image,
  })
  if (!response.ok) throw new Error(`PROPERTY_IMAGE_UPLOAD_HTTP_${response.status}`)

  const result: unknown = await response.json()
  if (!result || typeof result !== 'object' || !('path' in result) || typeof result.path !== 'string'
    || !PROPERTY_IMAGE_PATH_PATTERN.test(result.path)) {
    throw new Error('PROPERTY_IMAGE_UPLOAD_INVALID_RESPONSE')
  }
  return result.path
}
