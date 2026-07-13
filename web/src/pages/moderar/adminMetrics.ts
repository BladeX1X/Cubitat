import { supabase } from '../../shared/lib/supabaseClient'

type ProviderError = string | null

export type AdminMetrics = {
  cloudflare: { requests: number | null; error: ProviderError }
  analytics: { activeUsers: number | null; error: ProviderError }
  supabase: {
    storage_bytes: number | null
    egress_bytes: number | null
    db_bytes: number | null
    error: ProviderError
  }
}

export async function fetchAdminMetrics(
  fetcher: typeof fetch = fetch,
): Promise<AdminMetrics> {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error('No hay una sesión administrativa vigente.')
  }

  const response = await fetcher('/api/metrics', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (response.status === 401) {
    throw new Error('La sesión administrativa expiró. Inicia sesión nuevamente.')
  }
  if (response.status === 403) {
    throw new Error('La cuenta actual no tiene permisos para consultar métricas.')
  }
  if (!response.ok) {
    throw new Error('El servicio de métricas no está disponible temporalmente.')
  }

  const metrics = await response.json() as Partial<AdminMetrics>

  return {
    cloudflare: {
      requests: metrics.cloudflare?.requests ?? null,
      error: metrics.cloudflare?.error ?? null,
    },
    analytics: {
      activeUsers: metrics.analytics?.activeUsers ?? null,
      error: metrics.analytics?.error ?? null,
    },
    supabase: {
      storage_bytes: metrics.supabase?.storage_bytes ?? null,
      egress_bytes: metrics.supabase?.egress_bytes ?? null,
      db_bytes: metrics.supabase?.db_bytes ?? null,
      error: metrics.supabase?.error ?? null,
    },
  }
}
