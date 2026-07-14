import { supabase } from '../../../shared/lib/supabaseClient'
import { PAGE_SIZE } from '../core/constants'
import type { ModerationProperty, StatusCounts, StatusFilter } from '../core/types'

const PROPERTY_SELECT = 'id,title,location,description,price_usd,cover_image,images,created_at,user_id,operation,property_type,bedrooms,bathrooms,parking,area_m2,age_years,amenities,features,contact_info,status,moderation_message'

type ProfileSummary = { id: string; full_name: string | null; email: string | null }

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

  return {
    all: allResult.count ?? 0,
    pending_review: statusResults[0]?.count ?? 0,
    ai_approved: statusResults[1]?.count ?? 0,
    ai_rejected: statusResults[2]?.count ?? 0,
    published: statusResults[3]?.count ?? 0,
    paused: statusResults[4]?.count ?? 0,
    owner_hidden: statusResults[5]?.count ?? 0,
  }
}

export async function fetchModerationProperties(status: StatusFilter, page: number) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let query = supabase
    .from('properties')
    .select(PROPERTY_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  const properties = (data ?? []) as unknown as ModerationProperty[]
  if (properties.length === 0) return { properties: [], total: count ?? 0 }

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

  return {
    total: count ?? 0,
    properties: properties.map((property) => ({
      ...property,
      user_email: profileMap.get(property.user_id),
    })),
  }
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
