import { supabase } from './supabaseClient'

export const CATALOG_CARD_IMAGE_TRANSFORM = {
  width: 420,
  height: 192,
  resize: 'cover',
  quality: 65,
} as const

/** Signs one private catalog image as a compact card thumbnail. */
export async function signCatalogCardImage(bucket: string, path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600, {
      transform: CATALOG_CARD_IMAGE_TRANSFORM,
    })
    if (error) return null
    return data?.signedUrl || null
  } catch {
    return null
  }
}
