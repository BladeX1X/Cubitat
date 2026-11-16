import { supabase } from '../../../shared/lib/supabaseClient'
import { PROPERTY_IMAGE_FALLBACK } from './images'

const IMAGE_UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PROPERTY_IMAGE_PATH = new RegExp(`^/(?:api/supabase/)?storage/v1/object/(?:public/)?property_images/(${IMAGE_UUID})/(${IMAGE_UUID}\\.webp)$`, 'i')
const MAX_PRIVATE_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_CONCURRENT_DOWNLOADS = 4
const PREVIEW_BATCH_TIMEOUT_MS = 8_000
const TRANSIENT_STORAGE_RETRY_DELAY_MS = 200

type PropertyRow = {
  id: string
  user_id: string
  cover_image: string | null
  cover_preview_url?: string | null
}

function isRetryableStorageFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return true
  const value = error as Record<string, unknown>
  const rawStatus = value.status ?? value.statusCode
  const status = typeof rawStatus === 'number'
    ? rawStatus
    : typeof rawStatus === 'string' && /^\d{3}$/.test(rawStatus)
      ? Number(rawStatus)
      : null
  return status === null || status === 408 || status === 429 || status >= 500
}

async function downloadPrivatePropertyImage(path: string) {
  try {
    const result = await supabase.storage.from('property_images').download(path)
    if (!result.error || !isRetryableStorageFailure(result.error)) return result
  } catch (error) {
    if (!isRetryableStorageFailure(error)) throw error
  }

  await new Promise(resolve => setTimeout(resolve, TRANSIENT_STORAGE_RETRY_DELAY_MS))
  return supabase.storage.from('property_images').download(path)
}

export function getOwnedPrivateImagePath(image: string | null, ownerId: string): string | null {
  if (!image || typeof window === 'undefined') return null
  try {
    const url = new URL(image, window.location.origin)
    const isAppProxy = url.origin === window.location.origin && url.pathname.startsWith('/api/supabase/')
    const isSupabaseStorageUrl = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
    if ((!isAppProxy && !isSupabaseStorageUrl) || url.username || url.password || url.search || url.hash) return null
    const match = PROPERTY_IMAGE_PATH.exec(url.pathname)
    if (!match || match[1].toLowerCase() !== ownerId.toLowerCase()) return null
    return `${match[1]}/${match[2]}`
  } catch {
    return null
  }
}

export function isOwnedPropertyImageReference(image: string, ownerId: string): boolean {
  return getOwnedPrivateImagePath(image, ownerId) !== null
}

/** Creates temporary previews only for canonical images in the signed-in owner's private bucket folder. */
export async function createOwnedPropertyCoverPreviews<T extends PropertyRow>(
  rows: readonly T[],
  ownerId: string,
): Promise<Array<T & { cover_image: string | null; cover_preview_url?: string | null }>> {
  const sourceByPath = new Map<string, T[]>()
  const prepared: Array<T & { cover_image: string | null; cover_preview_url?: string | null }> = rows.map((row) => ({ ...row }))
  for (const row of prepared) {
    if (row.user_id.toLowerCase() !== ownerId.toLowerCase()) {
      row.cover_image = PROPERTY_IMAGE_FALLBACK
      continue
    }
    const path = getOwnedPrivateImagePath(row.cover_image, ownerId)
    if (path) {
      row.cover_image = PROPERTY_IMAGE_FALLBACK
      const items = sourceByPath.get(path) ?? []
      items.push(row)
      sourceByPath.set(path, items)
    } else if (typeof window !== 'undefined'
      && row.cover_image?.startsWith(`${window.location.origin}/api/supabase/storage/v1/object/`)) {
      // A proxy URL that does not match the current owner's canonical path must not be rendered.
      row.cover_image = PROPERTY_IMAGE_FALLBACK
    }
  }

  const entries = [...sourceByPath.entries()]
  let nextIndex = 0
  let deadlineExceeded = false
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<void>((resolve) => {
    timeout = setTimeout(() => { deadlineExceeded = true; resolve() }, PREVIEW_BATCH_TIMEOUT_MS)
  })

  async function downloadNext() {
    while (nextIndex < entries.length && !deadlineExceeded) {
      const index = nextIndex++
      const [path, matchingRows] = entries[index]!
      try {
        const request = downloadPrivatePropertyImage(path)
        const result = await Promise.race([
          request,
          deadline.then(() => { throw new Error('private_image_preview_timeout') }),
        ])
        const { data, error } = result
        if (deadlineExceeded || error || !(data instanceof Blob) || data.size > MAX_PRIVATE_IMAGE_BYTES) continue
        if (data.type && data.type.toLowerCase() !== 'image/webp') continue
        const previewUrl = URL.createObjectURL(data)
        for (const row of matchingRows) {
          row.cover_preview_url = previewUrl
          row.cover_image = PROPERTY_IMAGE_FALLBACK
        }
      } catch {
        // Keep the management page usable without surfacing Storage internals.
        for (const row of matchingRows) row.cover_image = PROPERTY_IMAGE_FALLBACK
      }
    }
  }

  const downloads = Promise.all(Array.from(
    { length: Math.min(MAX_CONCURRENT_DOWNLOADS, entries.length) },
    () => downloadNext(),
  ))
  await Promise.race([downloads, deadline])
  if (timeout !== undefined) clearTimeout(timeout)
  return prepared
}

/** Downloads one canonical image from the signed-in owner's private folder for an editor preview. */
export async function createOwnedPropertyImagePreview(
  image: string,
  ownerId: string,
): Promise<{ previewUrl: string; size: number } | null> {
  const path = getOwnedPrivateImagePath(image, ownerId)
  if (!path) return null

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('private_image_preview_timeout')), PREVIEW_BATCH_TIMEOUT_MS)
    })
    const result = await Promise.race([
      downloadPrivatePropertyImage(path),
      deadline,
    ])
    if (result.error || !(result.data instanceof Blob) || result.data.size === 0
      || result.data.size > MAX_PRIVATE_IMAGE_BYTES
      || (result.data.type && result.data.type.toLowerCase() !== 'image/webp')) return null

    return { previewUrl: URL.createObjectURL(result.data), size: result.data.size }
  } catch {
    return null
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

export function revokePrivateImagePreviewUrls(rows: readonly PropertyRow[]) {
  for (const url of new Set(rows.map((row) => row.cover_preview_url).filter((value): value is string => Boolean(value)))) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
}
