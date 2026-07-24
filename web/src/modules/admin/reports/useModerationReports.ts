import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../core/errors'
import type { PropertyReport } from '../core/types'
import { dismissReport, fetchModerationReports, resolveReport } from './reportsRepository'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export function useModerationReports() {
  const [reports, setReports] = useState<PropertyReport[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (targetPage = 0) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchModerationReports(targetPage)
      setReports(result.reports)
      setTotal(result.total)
      setPage(targetPage)
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'load_reports',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setError(getErrorMessage(reason, 'No se pudieron cargar los reportes.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0)
  }, [load])

  const resolve = useCallback(async (reportId: string, propertyId: string) => {
    setActionLoading(reportId)
    try {
      await resolveReport(reportId, propertyId)
      setReports((current) => current.map((report) => (
        report.id === reportId ? { ...report, status: 'resolved' } : report
      )))
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'resolve_report',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setNotice(getErrorMessage(reason, 'No se pudo resolver el reporte.'))
    } finally {
      setActionLoading(null)
    }
  }, [])

  const dismiss = useCallback(async (reportId: string) => {
    setActionLoading(reportId)
    try {
      await dismissReport(reportId)
      setReports((current) => current.map((report) => (
        report.id === reportId ? { ...report, status: 'dismissed' } : report
      )))
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'dismiss_report',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setNotice('No se pudo descartar el reporte.')
    } finally {
      setActionLoading(null)
    }
  }, [])

  return {
    reports,
    page,
    total,
    loading,
    error,
    actionLoading,
    notice,
    clearNotice: () => setNotice(null),
    load,
    resolve,
    dismiss,
  }
}
