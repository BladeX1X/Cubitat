import { useCallback, useEffect, useState } from 'react'
import type { ModerationProperty, StatusCounts, StatusFilter } from '../core/types'
import { getErrorMessage } from '../core/errors'
import {
  deleteModerationProperty,
  fetchModerationProperties,
  fetchStatusCounts,
  requestAiReevaluation,
  updateModerationPropertyStatus,
} from './propertiesRepository'

const EMPTY_COUNTS: StatusCounts = {
  pending_review: 0,
  ai_approved: 0,
  ai_rejected: 0,
  published: 0,
  paused: 0,
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
      console.error('Error loading property status counts:', reason)
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
      console.error('Error loading moderation properties:', reason)
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
      console.error('Error updating property:', reason)
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
      console.error('Error deleting property:', reason)
      setNotice('No se pudo eliminar la propiedad.')
    } finally {
      setActionLoading(null)
    }
  }, [refreshCounts])

  const reevaluate = useCallback(async (property: ModerationProperty) => {
    setActionLoading(property.id)
    try {
      await updateModerationPropertyStatus(property.id, 'pending_review', 'Reevaluando con IA...')
      setProperties((current) => current.map((item) => (
        item.id === property.id
          ? { ...item, status: 'pending_review', moderation_message: 'Reevaluando con IA...' }
          : item
      )))
      await requestAiReevaluation(property)
      setNotice('La reevaluación por IA ha iniciado. Refresca la página en unos segundos.')
      await refreshCounts()
    } catch (reason) {
      console.warn('Error preparando moderación asíncrona:', reason)
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
    remove,
    reevaluate,
  }
}
