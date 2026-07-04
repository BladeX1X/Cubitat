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

export function normalizePropertyImages(value: unknown): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map(normalizeImageCandidate)
      .filter((image): image is string => Boolean(image))
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
  }

  return []
}

export function getPropertyGalleryImages(coverImage: string, images?: string[]): string[] {
  return Array.from(
    new Set([coverImage, ...(images ?? [])].map(normalizeImageCandidate).filter(Boolean) as string[]),
  )
}

export function optimizePropertyCardImage(image: string): string {
  try {
    const url = new URL(image)
    if (url.hostname !== 'images.unsplash.com') return image
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('w', '500')
    url.searchParams.set('q', '55')
    return url.toString()
  } catch {
    return image
  }
}
