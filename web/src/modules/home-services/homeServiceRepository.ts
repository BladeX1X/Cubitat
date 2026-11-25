import { HOME_SERVICE_CATEGORIES, type HomeServiceCategory, type HomeServiceProvider, type OwnedHomeServiceProvider } from './types'
import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import { aggregateProvinceCounts } from '../marketplace/provinceAggregates'
import { signCatalogCardImage } from '../../shared/lib/catalogStorageImage'
import { normalizePropertyCoordinates } from '../maps/lib/propertyCoordinates'
import {
  getHomeServicePhotoBucket,
  isHomeServicePhotoPath,
} from './homeServicePhotos'

type ProviderRow = {
  id: unknown
  slug: unknown
  display_name: unknown
  category: unknown
  description: unknown
  province: unknown
  municipalities: unknown
  coordinates: unknown
  phone: unknown
  whatsapp: unknown
  gallery_urls: unknown
  updated_at: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parseImageUrls(value: unknown): string[] {
  return parseStringList(value).filter((candidate) => {
    if (isHomeServicePhotoPath(candidate)) return true
    try { return new URL(candidate).protocol === 'https:' } catch { return false }
  }).slice(0, 10)
}

async function signHomeServicePhotos(
  providers: HomeServiceProvider[],
  options: { preserveMissing?: boolean; coverOnly?: boolean } = {},
): Promise<HomeServiceProvider[]> {
  const { preserveMissing = false, coverOnly = false } = options
  const pathsByBucket = new Map<string, Set<string>>()
  for (const provider of providers) {
    const references = coverOnly ? provider.galleryUrls.slice(0, 1) : provider.galleryUrls
    for (const reference of references) {
      const bucket = getHomeServicePhotoBucket(reference)
      if (!bucket) continue
      const paths = pathsByBucket.get(bucket) ?? new Set<string>()
      paths.add(reference)
      pathsByBucket.set(bucket, paths)
    }
  }

  const signedUrls = new Map<string, string>()
  for (const [bucket, pathSet] of pathsByBucket) {
    const paths = Array.from(pathSet)
    const transformedResults = coverOnly
      ? await Promise.all(paths.map(async (path) => ({ path, signedUrl: await signCatalogCardImage(bucket, path) })))
      : []
    const fallbackPaths = coverOnly
      ? transformedResults.flatMap((item) => {
        if (item.signedUrl) {
          signedUrls.set(`${bucket}:${item.path}`, item.signedUrl)
          return []
        }
        return [item.path]
      })
      : paths
    for (let offset = 0; offset < fallbackPaths.length; offset += 100) {
      const batch = fallbackPaths.slice(offset, offset + 100)
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(batch, 3600)
      if (error) {
        logSafeEvent({ module: 'home_services', action: 'sign_provider_photos', level: 'warn', code: sanitizeErrorReason(error) })
        continue
      }
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) signedUrls.set(`${bucket}:${item.path}`, item.signedUrl)
      }
    }
  }
  return providers.map((provider) => {
    const references = coverOnly ? provider.galleryUrls.slice(0, 1) : provider.galleryUrls
    const photoUnavailable = references.some((reference) => {
      const bucket = getHomeServicePhotoBucket(reference)
      return bucket !== null && !signedUrls.has(`${bucket}:${reference}`)
    })
    return {
      ...provider,
      photoUnavailable,
      galleryUrls: references.flatMap((reference) => {
        const bucket = getHomeServicePhotoBucket(reference)
        if (!bucket) return [reference]
        const signedUrl = signedUrls.get(`${bucket}:${reference}`)
        return signedUrl ? [signedUrl] : preserveMissing ? [''] : []
      }),
    }
  })
}

function parseProvider(value: unknown): HomeServiceProvider | null {
  if (!isRecord(value)) return null
  const row = value as ProviderRow
  if (
    typeof row.id !== 'string' || typeof row.slug !== 'string'
    || typeof row.display_name !== 'string'
    || typeof row.category !== 'string'
    || !HOME_SERVICE_CATEGORIES.includes(row.category as HomeServiceCategory)
    || typeof row.description !== 'string' || typeof row.province !== 'string'
    || typeof row.updated_at !== 'string'
  ) return null

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    category: row.category as HomeServiceCategory,
    description: row.description,
    province: row.province,
    municipalities: parseStringList(row.municipalities),
    coordinates: normalizePropertyCoordinates(row.coordinates),
    phone: typeof row.phone === 'string' ? row.phone : null,
    whatsapp: typeof row.whatsapp === 'string' ? row.whatsapp : null,
    galleryUrls: parseImageUrls(row.gallery_urls),
    updatedAt: row.updated_at,
  }
}

function logLoadFailure(action: string, error: unknown): never {
  logSafeEvent({ module: 'home_services', action, level: 'error', code: sanitizeErrorReason(error) })
  throw new Error('HOME_SERVICES_LOAD_FAILED')
}

export async function fetchHomeServiceProviders(filters: {
  category?: HomeServiceCategory
  province?: string
  municipality?: string
  search?: string
  offset?: number
  pageSize?: number
  coverOnly?: boolean
} = {}): Promise<{ items: HomeServiceProvider[]; total: number }> {
  try {
    let query = supabase
      .from('home_service_providers')
      .select('id, slug, display_name, category, description, province, municipalities, coordinates, gallery_urls, updated_at', { count: 'exact' })
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .range(Math.max(0, filters.offset ?? 0), Math.max(0, filters.offset ?? 0) + Math.min(60, Math.max(1, filters.pageSize ?? 24)) - 1)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.province) query = query.eq('province', filters.province)
    if (filters.municipality) query = query.contains('municipalities', [filters.municipality])
    const search = filters.search?.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ')
    if (search) query = query.or(`display_name.ilike.%${search}%,description.ilike.%${search}%`)

    const { data, error, count } = await query
    if (error) return logLoadFailure('fetch_provider_list', error)
    const items = (Array.isArray(data) ? data : []).map(parseProvider).filter((row): row is HomeServiceProvider => row !== null)
    return { items: await signHomeServicePhotos(items, { coverOnly: filters.coverOnly }), total: count ?? 0 }
  } catch (error) {
    return logLoadFailure('fetch_provider_list_exception', error)
  }
}

/** Loads the full filtered public catalog for clustering and viewport matching. */
export async function fetchHomeServiceProvidersForMap(filters: {
  category?: HomeServiceCategory
  province?: string
  municipality?: string
  search?: string
} = {}): Promise<HomeServiceProvider[]> {
  const items: HomeServiceProvider[] = []
  let total = 0
  do {
    const page = await fetchHomeServiceProviders({ ...filters, offset: items.length, pageSize: 60, coverOnly: true })
    items.push(...page.items)
    total = page.total
    if (page.items.length === 0) break
  } while (items.length < total)
  return items
}

export async function fetchHomeServiceProvinceCounts(filters: {
  category?: HomeServiceCategory
  municipality?: string
  search?: string
} = {}): Promise<{ province: string; count: number }[]> {
  try {
    const rows: { province: string }[] = []
    const pageSize = 1000
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase.from('home_service_providers').select('province', { count: 'exact' })
        .eq('status', 'published').order('province').range(offset, offset + pageSize - 1)
      if (filters.category) query = query.eq('category', filters.category)
      if (filters.municipality) query = query.contains('municipalities', [filters.municipality])
      const search = filters.search?.trim().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ')
      if (search) query = query.or(`display_name.ilike.%${search}%,description.ilike.%${search}%`)
      const { data, error, count } = await query
      if (error) return logLoadFailure('fetch_provider_province_counts', error)
      const page = (Array.isArray(data) ? data : []).filter((row): row is { province: string } => isRecord(row) && typeof row.province === 'string')
      rows.push(...page)
      if (page.length < pageSize || rows.length >= (count ?? 0)) break
    }
    return aggregateProvinceCounts(rows)
  } catch (error) {
    return logLoadFailure('fetch_provider_province_counts_exception', error)
  }
}

export async function fetchHomeServiceProvider(slug: string): Promise<HomeServiceProvider | null> {
  try {
    const { data, error } = await supabase
      .from('home_service_providers')
      .select('id, slug, display_name, category, description, province, municipalities, coordinates, gallery_urls, updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw error
    const provider = parseProvider(data)
    return provider ? (await signHomeServicePhotos([provider]))[0] ?? null : null
  } catch (error) {
    return logLoadFailure('fetch_provider_detail', error)
  }
}

export async function fetchHomeServiceProvidersByIds(ids: readonly string[]): Promise<HomeServiceProvider[]> {
  const listingIds = Array.from(new Set(ids)).slice(0, 100)
  if (listingIds.length === 0) return []
  try {
    const { data, error } = await supabase
      .from('home_service_providers')
      .select('id, slug, display_name, category, description, province, municipalities, coordinates, gallery_urls, updated_at')
      .in('id', listingIds)
      .eq('status', 'published')
    if (error) throw error
    const providers = (Array.isArray(data) ? data : []).map(parseProvider).filter((row): row is HomeServiceProvider => row !== null)
    return signHomeServicePhotos(providers, { coverOnly: true })
  } catch (error) {
    return logLoadFailure('fetch_saved_provider_profiles', error)
  }
}

export async function fetchMyHomeServiceProviders(): Promise<OwnedHomeServiceProvider[]> {
  const { data, error } = await supabase.rpc('get_my_home_service_providers')
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'fetch_owned_provider_profiles', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('OWNED_HOME_SERVICES_LOAD_FAILED')
  }
  if (!Array.isArray(data)) return []
  const providers = data.flatMap((value) => {
    const provider = parseProvider(value)
    if (!provider || !isRecord(value) || typeof value.status !== 'string'
      || !['pending_review', 'published', 'paused', 'rejected'].includes(value.status)) return []
    return [{ ...provider, galleryReferences: provider.galleryUrls, status: value.status as OwnedHomeServiceProvider['status'] }]
  })
  const signedProviders = await signHomeServicePhotos(providers, { preserveMissing: true })
  return providers.map((provider, index) => ({ ...signedProviders[index], galleryReferences: provider.galleryReferences, status: provider.status }))
}

export async function sendHomeServiceInquiry(providerId: string, message: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('AUTH_REQUIRED')
  const { error } = await supabase.from('home_service_inquiries').insert({
    provider_id: providerId,
    sender_id: user.id,
    message: message.trim(),
  })
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'send_provider_inquiry', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('HOME_SERVICE_INQUIRY_FAILED')
  }
}

export async function createHomeServiceProvider(input: {
  displayName: string
  category: HomeServiceCategory
  description: string
  province: string
  municipalities: string[]
  coordinates: { latitude: number; longitude: number } | null
  phone: string | null
  whatsapp: string | null
  galleryUrls: string[]
}, providerId: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('AUTH_REQUIRED')
  const baseSlug = input.displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'profesional'
  const { error } = await supabase.from('home_service_providers').insert({
    id: providerId,
    owner_id: user.id,
    slug: `${baseSlug}-${providerId.replaceAll('-', '').slice(0, 8)}`,
    display_name: input.displayName.trim(),
    category: input.category,
    description: input.description.trim(),
    province: input.province.trim(),
    municipalities: input.municipalities,
    coordinates: input.coordinates,
    phone: input.phone,
    whatsapp: input.whatsapp,
    gallery_urls: input.galleryUrls,
  })
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'create_service_provider', level: 'warn', code: sanitizeErrorReason(error) })
    // If the first INSERT committed but its response was lost, a retry with the
    // same client id hits the primary key. Update that owned draft instead of
    // creating a second profile or leaving the retry stuck.
    if (isHomeServiceProviderIdConflict(error)) {
      await updateHomeServiceProvider(providerId, input)
      return
    }
    throw new Error(isPermissionDenied(error) ? 'HOME_SERVICE_PROFILE_PERMISSION_DENIED' : 'HOME_SERVICE_PROFILE_CREATE_FAILED')
  }
}

export async function updateHomeServiceProvider(providerId: string, input: {
  displayName: string
  category: HomeServiceCategory
  description: string
  province: string
  municipalities: string[]
  coordinates: { latitude: number; longitude: number } | null
  phone: string | null
  whatsapp: string | null
  galleryUrls: string[]
}): Promise<void> {
  const { error } = await supabase.rpc('update_home_service_provider', {
    p_id: providerId,
    p_display_name: input.displayName.trim(),
    p_category: input.category,
    p_description: input.description.trim(),
    p_province: input.province.trim(),
    p_municipalities: input.municipalities,
    p_coordinates: input.coordinates,
    p_phone: input.phone,
    p_whatsapp: input.whatsapp,
    p_gallery_urls: input.galleryUrls,
  })
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'update_service_provider', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error(isPermissionDenied(error) ? 'HOME_SERVICE_PROFILE_PERMISSION_DENIED' : 'HOME_SERVICE_PROFILE_UPDATE_FAILED')
  }
}

function isPermissionDenied(error: unknown): boolean {
  return isRecord(error) && error.code === '42501'
}

function isHomeServiceProviderIdConflict(error: unknown): boolean {
  if (!isRecord(error) || error.code !== '23505') return false
  const diagnostic = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
  return /home_service_providers_pkey/i.test(diagnostic)
}
