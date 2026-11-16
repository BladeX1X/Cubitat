function normalizeImageCandidate(value: unknown): string | null {
  if (typeof value === 'string') {
    const image = value.trim()
    return image.length > 0 ? image : null
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return normalizeImageCandidate(record.url ?? record.src ?? record.path ?? record.publicUrl)
  }

  return null
}

/** Routes property-bucket images through the app proxy because the bucket is private. */
export function normalizePropertyImageReference(image: string): string {
  if (typeof window === 'undefined') return image

  try {
    const url = new URL(image, window.location.origin)
    const isAppProxy = url.origin === window.location.origin
    const isSupabaseStorage = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
    const isLocalSupabaseStorage = url.protocol === 'http:'
      && ['localhost', '127.0.0.1'].includes(url.hostname)
      && url.port === '54321'
    if ((!isAppProxy && !isSupabaseStorage && !isLocalSupabaseStorage)
      || url.username || url.password || url.search || url.hash) return image

    const match = url.pathname.match(/^\/(?:api\/supabase\/)?storage\/v1\/object\/(?:public\/)?property_images\/(.+)$/i)
    if (!match || !match[1] || match[1].split('/').some(segment => !segment || segment === '.' || segment === '..')) return image

    return `${window.location.origin}/api/supabase/storage/v1/object/property_images/${match[1]}`
  } catch {
    return image
  }
}

export function normalizePropertyImages(value: unknown): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map(normalizeImageCandidate)
      .filter((image): image is string => Boolean(image))
      .map(normalizePropertyImageReference)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return normalizePropertyImages(parsed)
      }
    } catch {
      // Fallback for comma-separated values saved by a manual import.
    }

    return trimmed
      .split(',')
      .map((image) => image.trim())
      .filter(Boolean)
      .map(normalizePropertyImageReference)
  }

  return []
}

export function getPropertyGalleryImages(coverImage: string, images?: string[]): string[] {
  return Array.from(
    new Set(
      [coverImage, ...(images ?? [])]
        .map(normalizeImageCandidate)
        .filter((image): image is string => Boolean(image))
        .map(normalizePropertyImageReference),
    ),
  )
}

export function optimizePropertyCardImage(image: string): string {
  try {
    const url = new URL(image)
    if (url.hostname !== 'images.unsplash.com') return image
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('w', '420')
    url.searchParams.set('q', '45')
    return url.toString()
  } catch {
    return image
  }
}
export const PROPERTY_IMAGE_FALLBACK =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 500%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop stop-color=%22%23dce8e4%22/%3E%3Cstop offset=%221%22 stop-color=%22%23b9d1ca%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22800%22 height=%22500%22 fill=%22url(%23g)%22/%3E%3C/svg%3E'

export function getPropertyCoverImage(value: unknown): string {
  const image = normalizeImageCandidate(value)
  return image ? normalizePropertyImageReference(image) : PROPERTY_IMAGE_FALLBACK
}
