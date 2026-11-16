const PUBLIC_STORAGE_OBJECT_PATH = '/storage/v1/object/public/'
const SAME_ORIGIN_PUBLIC_STORAGE_PROXY_PATH = '/api/supabase/storage/v1/object/public/'
const PUBLIC_PROPERTY_IMAGE_PATH = `${PUBLIC_STORAGE_OBJECT_PATH}property_images/`
const SAME_ORIGIN_PUBLIC_PROPERTY_IMAGE_PATH = `${SAME_ORIGIN_PUBLIC_STORAGE_PROXY_PATH}property_images/`
const PROPERTY_IMAGE_CACHE_NAME = 'supabase-image-cache'

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function pathStartsWith(url: URL, prefix: string): boolean {
  let path = url.pathname
  for (let pass = 0; pass < 3; pass += 1) {
    if (path.startsWith(prefix)) return true
    try {
      const decoded = decodeURIComponent(path)
      if (decoded === path) return false
      path = decoded
    } catch {
      return false
    }
  }
  return path.startsWith(prefix)
}

export function isPropertyImageCacheEntry(
  url: URL,
  applicationOrigin: string,
  configuredSupabaseUrl: string,
): boolean {
  if (url.protocol !== 'https:' || url.username || url.password) return false

  const appOrigin = parseOrigin(applicationOrigin)
  const supabaseOrigin = parseOrigin(configuredSupabaseUrl)
  if (!appOrigin || !supabaseOrigin) return false

  const isLegacyDirectPropertyImage = pathStartsWith(url, PUBLIC_PROPERTY_IMAGE_PATH)
    && (url.origin === supabaseOrigin || url.hostname.endsWith('.supabase.co'))
  const isLegacyProxiedPropertyImage = url.origin === appOrigin
    && pathStartsWith(url, SAME_ORIGIN_PUBLIC_PROPERTY_IMAGE_PATH)

  return isLegacyDirectPropertyImage || isLegacyProxiedPropertyImage
}

export function isCacheablePublicStorageImage(
  url: URL,
  applicationOrigin: string,
  configuredSupabaseUrl: string,
): boolean {
  if (url.protocol !== 'https:' || url.username || url.password) return false
  if (isPropertyImageCacheEntry(url, applicationOrigin, configuredSupabaseUrl)) return false

  const appOrigin = parseOrigin(applicationOrigin)
  const supabaseOrigin = parseOrigin(configuredSupabaseUrl)
  if (!appOrigin || !supabaseOrigin) return false

  const isDirectSupabasePublicObject = url.origin === supabaseOrigin
    && pathStartsWith(url, PUBLIC_STORAGE_OBJECT_PATH)
  const isSameOriginPublicObject = url.origin === appOrigin
    && pathStartsWith(url, SAME_ORIGIN_PUBLIC_STORAGE_PROXY_PATH)

  return isDirectSupabasePublicObject || isSameOriginPublicObject
}

export async function purgeLegacyPropertyImageCacheEntries(
  cacheStorage: CacheStorage,
  applicationOrigin: string,
  configuredSupabaseUrl: string,
): Promise<number> {
  try {
    if (!(await cacheStorage.keys()).includes(PROPERTY_IMAGE_CACHE_NAME)) return 0

    const cache = await cacheStorage.open(PROPERTY_IMAGE_CACHE_NAME)
    const requests = await cache.keys()
    const propertyImages = requests.filter((request) => (
      isPropertyImageCacheEntry(new URL(request.url), applicationOrigin, configuredSupabaseUrl)
    ))
    const deleted = await Promise.all(propertyImages.map((request) => cache.delete(request)))
    return deleted.filter(Boolean).length
  } catch {
    // If selective cleanup fails, remove the whole image cache rather than
    // leave property photos that were cached by an older service worker.
    try {
      await cacheStorage.delete(PROPERTY_IMAGE_CACHE_NAME)
    } catch {
      // The new worker still stops serving property images from this cache.
    }
    return 0
  }
}
