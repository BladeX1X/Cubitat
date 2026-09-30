import { useCallback, useEffect, useState } from 'react'
import type { ModerationProperty, StatusCounts, StatusFilter } from '../core/types'
import { getErrorMessage } from '../core/errors'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import {
  deleteModerationProperty,
  fetchModerationProperties,
  fetchStatusCounts,
  hideModerationProperty,
  requestAiReevaluation,
  restoreModerationProperty,
  updateModerationPropertyStatus,
} from './propertiesRepository'
import { waitForModerationResult } from './moderationPolling'

const EMPTY_COUNTS: StatusCounts = {
  pending_review: 0,
  ai_approved: 0,
  ai_rejected: 0,
  published: 0,
  paused: 0,
  owner_hidden: 0,
  all: 0,
}

export function useModerationProperties() {
  const [properties, setProperties] = useState<ModerationProperty[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>(EMPTY_COUNTS)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refreshCounts = useCallback(async () => {
    try {
      setStatusCounts(await fetchStatusCounts())
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'fetch_status_counts',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
    }
  }, [])

  const load = useCallback(async (targetPage = 0) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchModerationProperties(statusFilter, targetPage)
      setProperties(result.properties)
      setTotal(result.total)
      setPage(targetPage)
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'load_moderation_properties',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setError(getErrorMessage(reason, 'Error al cargar propiedades'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void Promise.all([load(0), refreshCounts()])
  }, [load, refreshCounts])

  const changeStatus = useCallback(async (
    id: string,
    status: ModerationProperty['status'],
    message: string | null = null,
  ) => {
    setActionLoading(id)
    try {
      await updateModerationPropertyStatus(id, status, message)
      setProperties((current) => current.map((property) => (
        property.id === id ? { ...property, status, moderation_message: message } : property
      )))
      await refreshCounts()
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'update_property_status',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setNotice('No se pudo actualizar la propiedad.')
    } finally {
      setActionLoading(null)
    }
  }, [refreshCounts])

  const remove = useCallback(async (id: string) => {
    setActionLoading(id)
    try {
      await deleteModerationProperty(id)
      setProperties((current) => current.filter((property) => property.id !== id))
      await refreshCounts()
    } catch (reason) {
      logSafeEvent({
        module: 'admin',
        action: 'delete_property',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setNotice('No se pudo eliminar la propiedad.')
    } finally {
      setActionLoading(null)
    }
  }, [refreshCounts])

  const hide = useCallback(async (id: string, reason: string) => {
    setActionLoading(id)
    setNotice(null)
    try {
      await hideModerationProperty(id, reason)
      setProperties((current) => current.map((property) => (
        property.id === id
          ? { ...property, status: 'paused', moderation_message: reason }
          : property
      )))
      setNotice('La publicación quedó oculta por moderación.')
      await refreshCounts()
    } catch (caughtReason) {
      logSafeEvent({
        module: 'admin',
        action: 'hide_property',
        level: 'error',
        code: sanitizeErrorReason(caughtReason),
      })
      setNotice('No se pudo ocultar la publicación.')
    } finally {
      setActionLoading(null)
    }
  }, [refreshCounts])

  const restore = useCallback(async (id: string) => {
    setActionLoading(id)
    setNotice(null)
    try {
      await restoreModerationProperty(id)
      setProperties((current) => current.map((property) => (
        property.id === id
          ? { ...property, status: 'published', moderation_message: null }
          : property
      )))
      setNotice('La publicación volvió a estar visible.')
      await refreshCounts()
    } catch (caughtReason) {
      logSafeEvent({
        module: 'admin',
        action: 'restore_property',
        level: 'error',
        code: sanitizeErrorReason(caughtReason),
      })
      setNotice('No se pudo volver a publicar. Verifica que fue ocultada por moderación.')
    } finally {
      setActionLoading(null)
    }
  }, [refreshCounts])

  const reevaluate = useCallback(async (property: ModerationProperty) => {
    setActionLoading(property.id)
    const previousState = {
      status: property.status,
      moderation_message: property.moderation_message,
    }
    let requestAccepted = false
    try {
      await updateModerationPropertyStatus(property.id, 'pending_review', 'Reevaluando con IA...')
      setProperties((current) => current.map((item) => (
        item.id === property.id
          ? { ...item, status: 'pending_review', moderation_message: 'Reevaluando con IA...' }
          : item
      )))
      await requestAiReevaluation(property)
      requestAccepted = true
      const result = await waitForModerationResult(property.id)

      if (result) {
        setProperties((current) => current.map((item) => (
          item.id === property.id ? { ...item, ...result } : item
        )))
        setNotice('La reevaluación terminó y la tarjeta se actualizó.')
      } else {
        setNotice('La reevaluación está tardando más de lo esperado. Puedes intentarlo nuevamente.')
      }
      await refreshCounts()
    } catch (reason) {
      if (!requestAccepted) {
        setProperties((current) => current.map((item) => (
          item.id === property.id ? { ...item, ...previousState } : item
        )))
        try {
          await updateModerationPropertyStatus(
            property.id,
            previousState.status,
            previousState.moderation_message,
          )
        } catch (rollbackReason) {
          logSafeEvent({
            module: 'admin',
            action: 'rollback_reevaluate_property',
            level: 'error',
            code: sanitizeErrorReason(rollbackReason),
          })
        }
      }
      logSafeEvent({
        module: 'admin',
        action: 'reevaluate_property',
        level: 'warn',
        code: sanitizeErrorReason(reason),
      })
      setNotice('Error al iniciar la reevaluación.')
    } finally {
      setActionLoading(null)
    }
  }, [refreshCounts])

  return {
    properties,
    statusFilter,
    setStatusFilter,
    statusCounts,
    page,
    total,
    loading,
    error,
    actionLoading,
    notice,
    clearNotice: () => setNotice(null),
    load,
    changeStatus,
    hide,
    restore,
    remove,
    reevaluate,
  }
}
