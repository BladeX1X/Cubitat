import { supabase } from '../../../shared/lib/supabaseClient'
import { IMAGE_DUPLICATE_MODERATION_ENABLED } from '../../../shared/config/features'
import { PAGE_SIZE } from '../core/constants'
import type { ModerationFilter, ModerationProperty, PropertyModerationFilters, StatusCounts, StatusFilter } from '../core/types'

const PROPERTY_SELECT = 'id,title,location,description,price_usd,cover_image,images,created_at,user_id,operation,property_type,bedrooms,bathrooms,parking,area_m2,age_years,amenities,features,contact_info,status,moderation_message'

type ProfileSummary = { id: string; full_name: string | null; email: string | null }
type DuplicateFlag = { property_id: string; duplicate_of: string }
type ImageDuplicateFlag = { property_id: string; duplicate_of: string; hamming_distance: number }
type DuplicateProperty = { id: string; title: string }
type ImageDuplicateProperty = Pick<ModerationProperty,
  'id' | 'title' | 'location' | 'price_usd' | 'cover_image' | 'images' | 'created_at' | 'operation' | 'property_type' | 'status' | 'description' | 'bedrooms' | 'bathrooms' | 'area_m2'
>
type ImageHashStatus = {
  property_id: string
  indexed_at: string | null
  processed_images: number | null
  eligible_with_images: number
  indexed_with_hashes: number
}

export async function fetchStatusCounts(): Promise<StatusCounts> {
  const statuses: Array<Exclude<StatusFilter, 'all'>> = [
    'pending_review', 'ai_approved', 'ai_rejected', 'published', 'paused', 'owner_hidden',
  ]
  const [allResult, ...statusResults] = await Promise.all([
    supabase.from('properties').select('id', { count: 'exact', head: true }),
    ...statuses.map((status) => (
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', status)
    )),
  ])

  if (allResult.error) throw allResult.error
  const firstError = statusResults.find((result) => result.error)?.error
  if (firstError) throw firstError

  let imageDuplicateCount = 0
  if (IMAGE_DUPLICATE_MODERATION_ENABLED) {
    const { data: imageMatches, error: imageMatchesError } = await supabase
      .rpc('get_admin_property_image_duplicate_candidates', { p_page: 0, p_page_size: 1 })
    if (imageMatchesError) throw imageMatchesError
    imageDuplicateCount = Number((imageMatches as { total_count?: number } | null)?.total_count ?? 0)
  }

  return {
    all: allResult.count ?? 0,
    image_duplicates: imageDuplicateCount,
    pending_review: statusResults[0]?.count ?? 0,
    ai_approved: statusResults[1]?.count ?? 0,
    ai_rejected: statusResults[2]?.count ?? 0,
    published: statusResults[3]?.count ?? 0,
    paused: statusResults[4]?.count ?? 0,
    owner_hidden: statusResults[5]?.count ?? 0,
  }
}

function safePropertySearch(value: string) {
  return value
    .trim()
    .replace(/[(),.*:%\\"']/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 100)
}

function nextUtcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

export async function fetchModerationProperties(
  status: ModerationFilter,
  page: number,
  filters?: PropertyModerationFilters,
) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let properties: ModerationProperty[]
  let total: number
  if (status === 'image_duplicates') {
    const { data: candidates, error: candidateError } = await supabase
      .rpc('get_admin_property_image_duplicate_candidates', { p_page: page, p_page_size: PAGE_SIZE })
    if (candidateError) throw candidateError
    const candidateResult = candidates as { property_ids?: string[]; total_count?: number } | null
    const ids = candidateResult?.property_ids ?? []
    total = Number(candidateResult?.total_count ?? 0)
    if (ids.length === 0) return { properties: [], total }
    const { data, error } = await supabase.from('properties').select(PROPERTY_SELECT).in('id', ids)
    if (error) throw error
    const byId = new Map(((data ?? []) as unknown as ModerationProperty[]).map((property) => [property.id, property]))
    properties = ids.flatMap((id) => byId.has(id) ? [byId.get(id)!] : [])
  } else {
    let query = supabase
      .from('properties')
      .select(PROPERTY_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
    if (status !== 'all') query = query.eq('status', status)
    const search = safePropertySearch(filters?.query ?? '')
    if (search) query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`)
    if (filters?.operation && filters.operation !== 'all') query = query.eq('operation', filters.operation)
    if (filters?.propertyType && filters.propertyType !== 'all') query = query.eq('property_type', filters.propertyType)
    if (filters?.createdAfter && /^\d{4}-\d{2}-\d{2}$/.test(filters.createdAfter)) {
      query = query.gte('created_at', `${filters.createdAfter}T00:00:00.000Z`)
    }
    const exclusiveEnd = filters?.createdBefore ? nextUtcDay(filters.createdBefore) : null
    if (exclusiveEnd) query = query.lt('created_at', exclusiveEnd)
    const { data, error, count } = await query.range(from, to)
    if (error) throw error
    properties = (data ?? []) as unknown as ModerationProperty[]
    total = count ?? 0
  }
  if (properties.length === 0) return { properties: [], total }

  const userIds = [...new Set(properties.map((property) => property.user_id))].filter(Boolean)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)
  if (profileError) throw profileError

  const profiles = (profileData ?? []) as unknown as ProfileSummary[]
  const profileMap = new Map(profiles.map((profile) => [
    profile.id,
    profile.full_name && profile.email
      ? `${profile.full_name} · ${profile.email}`
      : profile.email || profile.full_name || `ID ${profile.id.slice(0, 8)}`,
  ]))

  const duplicateMap = new Map<string, { id: string; title: string }>()
  const imageDuplicateMap = new Map<string, NonNullable<ModerationProperty['image_duplicate_matches']>>()
  const imageHashStatusMap = new Map<string, ImageHashStatus>()
  if (IMAGE_DUPLICATE_MODERATION_ENABLED) {
    const { data: duplicateFlags, error: duplicateError } = await supabase
      .from('property_duplicate_flags')
      .select('property_id, duplicate_of')
      .in('property_id', properties.map((property) => property.id))
      .is('resolved_at', null)
    if (duplicateError) throw duplicateError

    const flags = (duplicateFlags ?? []) as DuplicateFlag[]
    const duplicateIds = [...new Set(flags.map((flag) => flag.duplicate_of))]
    if (duplicateIds.length > 0) {
      const { data: duplicateProperties, error: duplicatePropertyError } = await supabase
        .from('properties')
        .select('id, title')
        .in('id', duplicateIds)
      if (duplicatePropertyError) throw duplicatePropertyError

      const titleMap = new Map(
        ((duplicateProperties ?? []) as DuplicateProperty[]).map((property) => [property.id, property.title]),
      )
      flags.forEach((flag) => {
        const title = titleMap.get(flag.duplicate_of)
        if (title) duplicateMap.set(flag.property_id, { id: flag.duplicate_of, title })
      })
    }

    const { data: imageHashStatuses, error: imageHashStatusError } = await supabase
      .rpc('get_admin_property_image_hash_status', {
        p_property_ids: properties.map((property) => property.id),
      })
    if (imageHashStatusError) throw imageHashStatusError
    ;((imageHashStatuses ?? []) as ImageHashStatus[]).forEach((status) => {
      imageHashStatusMap.set(status.property_id, status)
    })

    try {
      const { data: imageFlags, error: imageFlagsError } = await supabase
        .from('property_image_duplicate_flags')
        .select('property_id, duplicate_of, hamming_distance')
        .in('property_id', properties.map((property) => property.id))
        .is('resolved_at', null)
      if (imageFlagsError) throw imageFlagsError

      const flags = (imageFlags ?? []) as ImageDuplicateFlag[]
      const relatedIds = [...new Set(flags.map((flag) => flag.duplicate_of))]
      if (relatedIds.length > 0) {
        const { data: relatedProperties, error: relatedError } = await supabase
          .from('properties')
          .select('id, title, location, price_usd, cover_image, images, created_at, operation, property_type, status, description, bedrooms, bathrooms, area_m2')
          .in('id', relatedIds)
        if (relatedError) throw relatedError

        const relatedById = new Map(
          ((relatedProperties ?? []) as ImageDuplicateProperty[]).map((property) => [property.id, property]),
        )
        flags.forEach((flag) => {
          const related = relatedById.get(flag.duplicate_of)
          if (!related) return
          const matches = imageDuplicateMap.get(flag.property_id) ?? []
          matches.push({ ...related, distance: flag.hamming_distance })
          imageDuplicateMap.set(flag.property_id, matches)
        })
      }
    } catch (error) {
      // Keep old DEV deployments usable while the additive image-hash migration is pending.
      if (!(error instanceof TypeError)) throw error
    }
  }

  return {
    total,
    properties: properties.map((property) => ({
      ...property,
      user_email: profileMap.get(property.user_id),
      duplicate_of: duplicateMap.get(property.id)?.id,
      duplicate_title: duplicateMap.get(property.id)?.title,
      image_duplicate_matches: imageDuplicateMap.get(property.id) ?? [],
      image_hash_status: imageHashStatusMap.get(property.id)
        ? {
            indexed_at: imageHashStatusMap.get(property.id)?.indexed_at ?? null,
            processed_images: imageHashStatusMap.get(property.id)?.processed_images ?? null,
            eligible_with_images: imageHashStatusMap.get(property.id)?.eligible_with_images ?? 0,
            indexed_with_hashes: imageHashStatusMap.get(property.id)?.indexed_with_hashes ?? 0,
          }
        : undefined,
    })),
  }
}

export async function fetchModerationPropertyResult(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('status, moderation_message')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Pick<ModerationProperty, 'status' | 'moderation_message'>
}

export async function updateModerationPropertyStatus(
  id: string,
  status: ModerationProperty['status'],
  moderationMessage: string | null = null,
) {
  const { error } = await supabase
    .from('properties')
    .update({ status, moderation_message: moderationMessage })
    .eq('id', id)
  if (error) throw error
}

export async function hideModerationProperty(id: string, reason: string) {
  const { error } = await supabase
    .from('properties')
    .update({ status: 'paused', moderation_message: reason })
    .eq('id', id)
    .eq('status', 'published')
    .select('id')
    .single()
  if (error) throw error
}

export async function restoreModerationProperty(id: string) {
  const { error } = await supabase
    .from('properties')
    .update({ status: 'published', moderation_message: null })
    .eq('id', id)
    .eq('status', 'paused')
    .select('id')
    .single()
  if (error) throw error
}

export async function deleteModerationProperty(id: string) {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

export async function requestAiReevaluation(property: ModerationProperty) {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.access_token) throw new Error('No hay una sesión administrativa vigente.')

  const response = await fetch('/api/ai-moderate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      property_id: property.id,
      title: property.title,
      location: property.location || '',
      description: property.description || '',
      price_usd: property.price_usd,
      property_type: property.property_type,
      images: [property.cover_image, ...(property.images ?? [])].filter(Boolean),
    }),
  })
  if (!response.ok) throw new Error('No se pudo iniciar la reevaluación.')
}
