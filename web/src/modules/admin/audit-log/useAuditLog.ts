import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_SIZE } from '../core/constants'
import { getErrorMessage } from '../core/errors'
import { fetchAuditLog } from './auditLogRepository'
import type { AuditActionFilter, AuditLogEvent, AuditLogFilters, AuditSourceFilter } from './types'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

const INITIAL_FILTERS: AuditLogFilters = { action: 'all', source: 'all', query: '' }

export function useAuditLog() {
  const [events, setEvents] = useState<AuditLogEvent[]>([])
  const [filters, setFilters] = useState<AuditLogFilters>(INITIAL_FILTERS)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(async (targetPage = 0) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAuditLog({ ...filters, page: targetPage, pageSize: PAGE_SIZE })
      if (requestId.current !== currentRequest) return
      setEvents(result.events)
      setTotal(result.total)
      setPage(targetPage)
    } catch (reason) {
      if (requestId.current !== currentRequest) return
      logSafeEvent({
        module: 'admin',
        action: 'load_audit_log',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setError(getErrorMessage(reason, 'No se pudo cargar la bitácora.'))
    } finally {
      if (requestId.current === currentRequest) setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load(0)
  }, [load])

  const setAction = useCallback((action: AuditActionFilter) => {
    setFilters((current) => ({ ...current, action }))
  }, [])
  const setSource = useCallback((source: AuditSourceFilter) => {
    setFilters((current) => ({ ...current, source }))
  }, [])
  const setQuery = useCallback((query: string) => {
    setFilters((current) => ({ ...current, query }))
  }, [])

  return { events, filters, page, total, loading, error, setAction, setSource, setQuery, load }
}
