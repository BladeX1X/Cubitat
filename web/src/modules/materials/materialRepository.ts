import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import { MATERIAL_AVAILABILITIES, MATERIAL_CATEGORIES, MATERIAL_CURRENCIES, type MaterialCategory, type MaterialCurrency, type MaterialListing, type OwnedMaterialListing } from './types'
import { isMaterialPhotoPath, isMaterialPhotoReference, MATERIAL_PHOTO_BUCKET, validateMaterialPhotoFiles } from './materialPhotos'
import { aggregateProvinceCounts } from '../marketplace/provinceAggregates'
import { signCatalogCardImage } from '../../shared/lib/catalogStorageImage'
import { uploadMaterialPhoto } from './uploadMaterialPhoto'
import { normalizePropertyCoordinates } from '../maps/lib/propertyCoordinates'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parseImageReferences(value: unknown): string[] {
  return parseStringList(value).filter(isMaterialPhotoReference).slice(0, 10)
}

function parseMaterial(value: unknown): MaterialListing | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.slug !== 'string'
    || typeof value.title !== 'string' || typeof value.category !== 'string'
    || !MATERIAL_CATEGORIES.includes(value.category as MaterialCategory)
    || typeof value.description !== 'string' || typeof value.province !== 'string'
    || typeof value.currency !== 'string'
    || !MATERIAL_CURRENCIES.includes(value.currency as MaterialCurrency)
    || typeof value.availability !== 'string'
    || !MATERIAL_AVAILABILITIES.includes(value.availability as MaterialListing['availability'])
    || typeof value.updated_at !== 'string') return null
  const price = value.price == null ? null : Number(value.price)
  if (price !== null && (!Number.isFinite(price) || price < 0)) return null

  return {
    id: value.id,
    slug: value.slug,
    title: value.title,
    category: value.category as MaterialCategory,
    description: value.description,
    price,
    currency: value.currency as MaterialCurrency,
    province: value.province,
    coordinates: normalizePropertyCoordinates(value.coordinates),
    availability: value.availability as MaterialListing['availability'],
    phone: typeof value.phone === 'string' ? value.phone : null,
    whatsapp: typeof value.whatsapp === 'string' ? value.whatsapp : null,
    photoUrls: parseImageReferences(value.photo_urls),
    photoUnavailable: false,
    updatedAt: value.updated_at,
  }
}

function throwLoadError(action: string, error: unknown): never {
  logSafeEvent({ module: 'materials', action, level: 'error', code: sanitizeErrorReason(error) })
  throw new Error('MATERIALS_LOAD_FAILED')
}

async function signMaterialPhotos(
  listings: MaterialListing[],
  options: { coverOnly?: boolean; transformCover?: boolean } = {},
): Promise<MaterialListing[]> {
  const { coverOnly = false, transformCover = false } = options
  const paths = Array.from(new Set(listings.flatMap((listing) =>
    (coverOnly ? listing.photoUrls.slice(0, 1) : listing.photoUrls).filter(isMaterialPhotoPath),
  )))
  const signedUrls = new Map<string, string>()
  const transformedResults = transformCover
    ? await Promise.all(paths.map(async (path) => ({ path, signedUrl: await signCatalogCardImage(MATERIAL_PHOTO_BUCKET, path) })))
    : []
  const fallbackPaths = transformCover
    ? transformedResults.flatMap((item) => {
      if (item.signedUrl) {
        signedUrls.set(item.path, item.signedUrl)
        return []
      }
      return [item.path]
    })
    : paths
  for (let offset = 0; offset < fallbackPaths.length; offset += 100) {
    const batch = fallbackPaths.slice(offset, offset + 100)
    const { data, error } = await supabase.storage.from(MATERIAL_PHOTO_BUCKET).createSignedUrls(batch, 3600)
    if (error) {
      logSafeEvent({ module: 'materials', action: 'sign_material_photos', level: 'warn', code: sanitizeErrorReason(error) })
      continue
    }
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) signedUrls.set(entry.path, entry.signedUrl)
    }
  }

  return listings.map((listing) => {
    const references = coverOnly ? listing.photoUrls.slice(0, 1) : listing.photoUrls
    const photoUnavailable = references.some((reference) => isMaterialPhotoPath(reference) && !signedUrls.has(reference))
    return {
      ...listing,
      photoUnavailable,
      photoUrls: references.flatMap((reference) => {
      if (!isMaterialPhotoPath(reference)) return [reference]
      const signedUrl = signedUrls.get(reference)
      return signedUrl ? [signedUrl] : []
      }),
    }
  })
}

/** Signs only canonical photo paths owned by the signed-in user for this listing. */
export async function createOwnedMaterialPhotoPreviews(listingId: string, photoPaths: readonly string[]): Promise<{
  photos: Array<{ path: string; url: string }>
  unavailableCount: number
}> {
  const referencedPhotoCount = photoPaths.filter(isMaterialPhotoPath).length
  if (referencedPhotoCount === 0) return { photos: [], unavailableCount: 0 }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { photos: [], unavailableCount: referencedPhotoCount }

    const paths = Array.from(new Set(photoPaths.filter((path) => {
      if (!isMaterialPhotoPath(path)) return false
      const [ownerId, ownedListingId] = path.split('/')
      return ownerId?.toLowerCase() === user.id.toLowerCase() && ownedListingId === listingId
    })))
    if (paths.length === 0) return { photos: [], unavailableCount: referencedPhotoCount }

    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('material_photo_preview_timeout')), 8_000)
      })
      const result = await Promise.race([
        supabase.storage.from(MATERIAL_PHOTO_BUCKET).createSignedUrls(paths, 3600),
        deadline,
      ])
      if (result.error) {
        logSafeEvent({ module: 'materials', action: 'sign_owned_material_photo_previews', level: 'warn', code: sanitizeErrorReason(result.error) })
        return { photos: [], unavailableCount: referencedPhotoCount }
      }
      const requestedPaths = new Set(paths)
      const photos = (result.data ?? []).flatMap((entry) => entry.path && requestedPaths.has(entry.path) && entry.signedUrl
        ? [{ path: entry.path, url: entry.signedUrl }]
        : [])
      return { photos, unavailableCount: referencedPhotoCount - photos.length }
    } finally {
      if (timeout !== undefined) clearTimeout(timeout)
    }
  } catch (error) {
    logSafeEvent({ module: 'materials', action: 'sign_owned_material_photo_previews', level: 'warn', code: sanitizeErrorReason(error) })
    return { photos: [], unavailableCount: referencedPhotoCount }
  }
}

export async function fetchMaterialListings(filters: {
  category?: MaterialCategory
  province?: string
  availability?: Exclude<MaterialListing['availability'], 'out_of_stock'>
  search?: string
  offset?: number
  pageSize?: number
  coverOnly?: boolean
} = {}): Promise<{ items: MaterialListing[]; total: number }> {
  try {
    let query = supabase
      .from('material_listings')
      .select('id, slug, title, category, description, price, currency, province, coordinates, availability, photo_urls, updated_at', { count: 'exact' })
      .eq('status', 'published')
      .neq('availability', 'out_of_stock')
      .order('updated_at', { ascending: false })
      .range(Math.max(0, filters.offset ?? 0), Math.max(0, filters.offset ?? 0) + Math.min(60, Math.max(1, filters.pageSize ?? 24)) - 1)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.province) query = query.eq('province', filters.province)
    if (filters.availability) query = query.eq('availability', filters.availability)
    const search = filters.search?.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ')
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    const { data, error, count } = await query
    if (error) return throwLoadError('fetch_material_list', error)
    const listings = (Array.isArray(data) ? data : []).map(parseMaterial).filter((row): row is MaterialListing => row !== null)
    return { items: await signMaterialPhotos(listings, { coverOnly: filters.coverOnly, transformCover: filters.coverOnly }), total: count ?? listings.length }
  } catch (error) {
    return throwLoadError('fetch_material_list_exception', error)
  }
}

/** Loads all public, filtered listing coordinates for clustering and viewport matching. */
export async function fetchMaterialListingsForMap(filters: {
  category?: MaterialCategory
  province?: string
  availability?: Exclude<MaterialListing['availability'], 'out_of_stock'>
  search?: string
} = {}): Promise<MaterialListing[]> {
  const items: MaterialListing[] = []
  let total = 0
  do {
    const page = await fetchMaterialListings({ ...filters, offset: items.length, pageSize: 60, coverOnly: true })
    items.push(...page.items)
    total = page.total
    if (page.items.length === 0) break
  } while (items.length < total)
  return items
}

export async function fetchMaterialProvinceCounts(filters: {
  category?: MaterialCategory
  availability?: Exclude<MaterialListing['availability'], 'out_of_stock'>
  search?: string
} = {}): Promise<{ province: string; count: number }[]> {
  try {
    const rows: { province: string }[] = []
    const pageSize = 1000
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase.from('material_listings').select('province', { count: 'exact' })
        .eq('status', 'published').neq('availability', 'out_of_stock').order('province').range(offset, offset + pageSize - 1)
      if (filters.category) query = query.eq('category', filters.category)
      if (filters.availability) query = query.eq('availability', filters.availability)
      const search = filters.search?.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ')
      if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      const { data, error, count } = await query
      if (error) return throwLoadError('fetch_material_province_counts', error)
      const page = (Array.isArray(data) ? data : []).filter((row): row is { province: string } => isRecord(row) && typeof row.province === 'string')
      rows.push(...page)
      if (page.length < pageSize || rows.length >= (count ?? 0)) break
    }
    return aggregateProvinceCounts(rows)
  } catch (error) {
    return throwLoadError('fetch_material_province_counts_exception', error)
  }
}

export async function fetchMaterialListing(slug: string): Promise<MaterialListing | null> {
  try {
    const { data, error } = await supabase
      .from('material_listings')
      .select('id, slug, title, category, description, price, currency, province, coordinates, availability, photo_urls, updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw error
    const listing = parseMaterial(data)
    if (!listing) return null
    return (await signMaterialPhotos([listing]))[0] ?? null
  } catch (error) {
    return throwLoadError('fetch_material_detail', error)
  }
}

export async function fetchMaterialListingsByIds(ids: readonly string[]): Promise<MaterialListing[]> {
  const listingIds = Array.from(new Set(ids)).slice(0, 100)
  if (!listingIds.length) return []
  try {
    const { data, error } = await supabase.from('material_listings')
      .select('id, slug, title, category, description, price, currency, province, coordinates, availability, photo_urls, updated_at')
      .in('id', listingIds).eq('status', 'published').neq('availability', 'out_of_stock')
    if (error) throw error
    const listings = (Array.isArray(data) ? data : []).map(parseMaterial).filter((row): row is MaterialListing => row !== null)
    return signMaterialPhotos(listings, { coverOnly: true, transformCover: true })
  } catch (error) {
    return throwLoadError('fetch_saved_material_listings', error)
  }
}

export async function fetchMyMaterialListings(): Promise<OwnedMaterialListing[]> {
  const { data, error } = await supabase.rpc('get_my_material_listings')
  if (error) {
    logSafeEvent({ module: 'materials', action: 'fetch_owned_material_listings', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('OWNED_MATERIALS_LOAD_FAILED')
  }
  if (!Array.isArray(data)) return []
  return data.flatMap((value) => {
    const material = parseMaterial(value)
    if (!material || !isRecord(value) || typeof value.status !== 'string'
      || !['pending_review', 'published', 'paused', 'rejected', 'archived'].includes(value.status)) return []
    return [{
      ...material,
      photoUrls: [],
      photoPaths: material.photoUrls,
      status: value.status as OwnedMaterialListing['status'],
    }]
  })
}

export async function sendMaterialInquiry(listingId: string, message: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('AUTH_REQUIRED')
  const { error } = await supabase.from('material_inquiries').insert({
    listing_id: listingId,
    sender_id: user.id,
    message: message.trim(),
  })
  if (error) {
    logSafeEvent({ module: 'materials', action: 'send_material_inquiry', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('MATERIAL_INQUIRY_FAILED')
  }
}

export async function createMaterialListing(input: {
  title: string
  category: MaterialCategory
  description: string
  price: number | null
  currency: MaterialCurrency
  province: string
  coordinates: { latitude: number; longitude: number } | null
  availability: MaterialListing['availability']
  phone: string | null
  whatsapp: string | null
}, idempotencySlug: string): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('AUTH_REQUIRED')
  const { data, error } = await supabase.from('material_listings').insert({
    owner_id: user.id,
    slug: idempotencySlug,
    title: input.title.trim(),
    category: input.category,
    description: input.description.trim(),
    price: input.price,
    currency: input.currency,
    province: input.province.trim(),
    coordinates: input.coordinates,
    availability: input.availability,
    phone: input.phone,
    whatsapp: input.whatsapp,
    photo_urls: [],
  }).select('id').single()
  if (error) {
    logSafeEvent({ module: 'materials', action: 'create_material_listing', level: 'warn', code: sanitizeErrorReason(error) })
    if (isMaterialListingSlugConflict(error)) {
      // A retry after a lost INSERT response must reuse the same owned draft,
      // never create a second listing. The owner-scoped RPC verifies the slug.
      const { data: ownedListings, error: lookupError } = await supabase.rpc('get_my_material_listings')
      if (!lookupError && Array.isArray(ownedListings)) {
        const ownedListing = ownedListings.find((candidate) => isRecord(candidate)
          && candidate.slug === idempotencySlug && candidate.status === 'pending_review')
        if (isRecord(ownedListing) && typeof ownedListing.id === 'string') return ownedListing.id
      }
    }
    throw new Error('MATERIAL_LISTING_CREATE_FAILED')
  }
  if (!data || typeof data.id !== 'string') throw new Error('MATERIAL_LISTING_CREATE_FAILED')
  return data.id
}

function isMaterialListingSlugConflict(error: unknown): boolean {
  if (!isRecord(error) || error.code !== '23505') return false
  const diagnostic = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
  return /material_listings_slug_key/i.test(diagnostic)
}

export async function uploadMaterialPhotos(listingId: string, files: readonly File[], existingCount = 0): Promise<string[]> {
  const validationError = validateMaterialPhotoFiles(files, existingCount)
  if (validationError) throw new Error(`MATERIAL_PHOTO_${validationError}`)
  const { data: { session }, error: userError } = await supabase.auth.getSession()
  const user = session?.user
  if (userError || !user || !session?.access_token) throw new Error('AUTH_REQUIRED')
  const uploadedPaths: string[] = []
  try {
    for (const file of files) {
      if (file.type !== 'image/webp') throw new Error('MATERIAL_PHOTO_INVALID_TYPE')
      const path = await uploadMaterialPhoto(file, user.id, listingId, session.access_token)
      uploadedPaths.push(path)
    }
    return uploadedPaths
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from(MATERIAL_PHOTO_BUCKET).remove(uploadedPaths)
      if (cleanupError) {
        logSafeEvent({ module: 'materials', action: 'cleanup_unattached_material_photos', level: 'warn', code: sanitizeErrorReason(cleanupError) })
      }
    }
    logSafeEvent({ module: 'materials', action: 'upload_material_photos', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error(error instanceof Error && error.message.startsWith('MATERIAL_PHOTO_') ? error.message : 'MATERIAL_PHOTO_UPLOAD_FAILED')
  }
}

export async function removeUnattachedMaterialPhotos(paths: string[]): Promise<void> {
  const safePaths = paths.filter(isMaterialPhotoPath)
  if (!safePaths.length) return
  try {
    const { error } = await supabase.storage.from(MATERIAL_PHOTO_BUCKET).remove(safePaths)
    if (error) logSafeEvent({ module: 'materials', action: 'cleanup_unattached_material_photos', level: 'warn', code: sanitizeErrorReason(error) })
  } catch (error) {
    logSafeEvent({ module: 'materials', action: 'cleanup_unattached_material_photos', level: 'warn', code: sanitizeErrorReason(error) })
  }
}

export async function updateMaterialListing(listingId: string, input: {
  title: string
  category: MaterialCategory
  description: string
  price: number | null
  currency: MaterialCurrency
  province: string
  coordinates: { latitude: number; longitude: number } | null
  availability: MaterialListing['availability']
  phone: string | null
  whatsapp: string | null
  photoPaths: string[]
}): Promise<void> {
  const { error } = await supabase.rpc('update_material_listing', {
    p_id: listingId,
    p_title: input.title.trim(),
    p_category: input.category,
    p_description: input.description.trim(),
    p_price: input.price,
    p_currency: input.currency,
    p_province: input.province.trim(),
    p_coordinates: input.coordinates,
    p_availability: input.availability,
    p_phone: input.phone,
    p_whatsapp: input.whatsapp,
    p_photo_urls: input.photoPaths,
  })
  if (error) {
    logSafeEvent({ module: 'materials', action: 'update_material_listing', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error(isRecord(error) && error.code === '42501' ? 'MATERIAL_LISTING_PERMISSION_DENIED' : 'MATERIAL_LISTING_UPDATE_FAILED')
  }
}
