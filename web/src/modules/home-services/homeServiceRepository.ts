import { HOME_SERVICE_CATEGORIES, type HomeServiceCategory, type HomeServiceProvider, type OwnedHomeServiceProvider } from './types'
import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

type ProviderRow = {
  id: unknown
  slug: unknown
  display_name: unknown
  category: unknown
  description: unknown
  province: unknown
  municipalities: unknown
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
    try { return new URL(candidate).protocol === 'https:' } catch { return false }
  }).slice(0, 10)
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
} = {}): Promise<HomeServiceProvider[]> {
  try {
    let query = supabase
      .from('home_service_providers')
      .select('id, slug, display_name, category, description, province, municipalities, gallery_urls, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(60)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.province) query = query.eq('province', filters.province)

    const { data, error } = await query
    if (error) return logLoadFailure('fetch_provider_list', error)
    return (Array.isArray(data) ? data : []).map(parseProvider).filter((row): row is HomeServiceProvider => row !== null)
  } catch (error) {
    return logLoadFailure('fetch_provider_list_exception', error)
  }
}

export async function fetchHomeServiceProvider(slug: string): Promise<HomeServiceProvider | null> {
  try {
    const { data, error } = await supabase
      .from('home_service_providers')
      .select('id, slug, display_name, category, description, province, municipalities, gallery_urls, updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw error
    return parseProvider(data)
  } catch (error) {
    return logLoadFailure('fetch_provider_detail', error)
  }
}

export async function fetchMyHomeServiceProviders(): Promise<OwnedHomeServiceProvider[]> {
  const { data, error } = await supabase.rpc('get_my_home_service_providers')
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'fetch_owned_provider_profiles', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('OWNED_HOME_SERVICES_LOAD_FAILED')
  }
  if (!Array.isArray(data)) return []
  return data.flatMap((value) => {
    const provider = parseProvider(value)
    if (!provider || !isRecord(value) || typeof value.status !== 'string'
      || !['pending_review', 'published', 'paused', 'rejected'].includes(value.status)) return []
    return [{ ...provider, status: value.status as OwnedHomeServiceProvider['status'] }]
  })
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
  phone: string | null
  whatsapp: string | null
  galleryUrls: string[]
}): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('AUTH_REQUIRED')
  const baseSlug = input.displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'profesional'
  const { error } = await supabase.from('home_service_providers').insert({
    owner_id: user.id,
    slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
    display_name: input.displayName.trim(),
    category: input.category,
    description: input.description.trim(),
    province: input.province.trim(),
    municipalities: input.municipalities,
    phone: input.phone,
    whatsapp: input.whatsapp,
    gallery_urls: input.galleryUrls,
  })
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'create_service_provider', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('HOME_SERVICE_PROFILE_CREATE_FAILED')
  }
}

export async function updateHomeServiceProvider(providerId: string, input: {
  displayName: string
  category: HomeServiceCategory
  description: string
  province: string
  municipalities: string[]
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
    p_phone: input.phone,
    p_whatsapp: input.whatsapp,
    p_gallery_urls: input.galleryUrls,
  })
  if (error) {
    logSafeEvent({ module: 'home_services', action: 'update_service_provider', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('HOME_SERVICE_PROFILE_UPDATE_FAILED')
  }
}
