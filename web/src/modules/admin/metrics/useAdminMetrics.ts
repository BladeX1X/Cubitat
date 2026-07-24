import { useCallback, useEffect, useState } from 'react'
import { formatBytes } from '../core/formatters'
import { getErrorMessage } from '../core/errors'
import type { AdminMetrics } from '../core/types'
import { fetchDatabaseMetrics, fetchExternalAdminMetrics } from './adminMetricsRepository'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export type AdminStats = {
  db_size: string
  properties_count: number
  users_count: number
  reports_count: number
}

export function useAdminMetrics() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [externalError, setExternalError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setExternalError(null)
    try {
      const databaseMetrics = await fetchDatabaseMetrics()
      setStats({
        db_size: formatBytes(databaseMetrics.db_bytes),
        properties_count: databaseMetrics.properties_count,
        users_count: databaseMetrics.users_count,
        reports_count: databaseMetrics.reports_count,
      })

      try {
        const external = await fetchExternalAdminMetrics()
        setMetrics({
          ...external,
          supabase: {
            ...external.supabase,
            db_bytes: databaseMetrics.db_bytes,
            storage_bytes: databaseMetrics.storage_bytes,
            error: external.supabase.egress_bytes === null
              ? 'Base de datos y Storage actualizados. El egreso mensual requiere la API de uso de Supabase.'
              : external.supabase.error,
          },
        })
      } catch (reason) {
        logSafeEvent({
          module: 'admin',
          action: 'fetch_external_metrics',
          level: 'error',
          code: sanitizeErrorReason(reason),
        })
        setMetrics(null)
        setExternalError(getErrorMessage(reason, 'No se pudieron cargar las métricas externas.'))
      }
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'load_admin_stats',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setError('No se pudieron cargar las estadísticas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { stats, metrics, loading, error, externalError, load }
}
