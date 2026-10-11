type PropertyImages = {
  user_id: string
  cover_image: string | null
  images: string[] | null
}

export function getPropertyImageUrls(
  property: PropertyImages,
  supabaseUrl: string,
  publicSiteUrl?: string,
): string[] {
  const allowedPrefix = `${property.user_id}/`
  const storagePrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/property_images/`
  const prefixes = [
    storagePrefix,
    publicSiteUrl
      ? `${publicSiteUrl.replace(/\/$/, '')}/api/supabase/storage/v1/object/public/property_images/`
      : null,
  ].filter((prefix): prefix is string => prefix !== null)
  const images = new Set<string>()

  for (const image of [property.cover_image, ...(property.images ?? [])]) {
    if (typeof image !== 'string') continue
    const prefix = prefixes.find(candidate => image.startsWith(candidate))
    if (!prefix) continue
    const path = image.slice(prefix.length)
    if (!path.startsWith(allowedPrefix) || path.includes('..')) continue
    // Server-side fetches must bypass the public site's Worker proxy. Fetching
    // the same Worker from inside itself can return 404 instead of proxying.
    images.add(`${storagePrefix}${path}`)
    if (images.size >= 2) break
  }

  return [...images]
}
