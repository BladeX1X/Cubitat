import { useEffect, useMemo, useState } from 'react'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import {
  loadAgentDashboard,
  setOwnerPropertyVisibility,
  type AgentDashboardProperty,
} from '../agentDashboardRepository'

export type AgentStatusFilter = 'all' | 'published' | 'paused'

type ActionMessage = {
  type: 'success' | 'error'
  text: string
}

export function useAgentDashboard(userId: string) {
  const [properties, setProperties] = useState<AgentDashboardProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | undefined>()
  const [isVerifiedAgent, setIsVerifiedAgent] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<AgentStatusFilter>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setLoadError(false)
      try {
        const dashboard = await loadAgentDashboard(userId)
        if (!active) return
        setUserRole(dashboard.role)
        setIsVerifiedAgent(dashboard.isVerifiedAgent)
        setProperties(dashboard.properties)
      } catch (err) {
        logSafeEvent({
          module: 'agent_dashboard',
          action: 'load_dashboard_data',
          level: 'error',
          code: sanitizeErrorReason(err),
        })
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [userId])

  const activePropertiesCount = useMemo(
    () => properties.filter((property) => property.status === 'published').length,
    [properties],
  )
  const totalAccumulatedViews = useMemo(
    () => properties.reduce((sum, property) => sum + (property.view_count || 0), 0),
    [properties],
  )
  const totalContactClicks = useMemo(
    () => properties.reduce(
      (sum, property) => sum
        + (property.phone_clicks_count || 0)
        + (property.whatsapp_clicks_count || 0),
      0,
    ),
    [properties],
  )
  const filteredProperties = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase()
    return properties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(normalizedSearch) ||
        property.location.toLowerCase().includes(normalizedSearch)
      if (!matchesSearch) return false
      if (statusFilter === 'published') return property.status === 'published'
      if (statusFilter === 'paused') {
        return property.status === 'paused' || property.status === 'owner_hidden'
      }
      return true
    })
  }, [properties, searchQuery, statusFilter])

  async function toggleVisibility(property: AgentDashboardProperty) {
    const isPublished = property.status === 'published'
    const confirmed = window.confirm(
      isPublished
        ? '¿Deseas pausar esta publicación? Dejará de ser visible públicamente para potenciales compradores.'
        : '¿Deseas reactivar esta publicación? Volverá a estar activa y visible en el catálogo de Cubitat.',
    )
    if (!confirmed) return

    setUpdatingId(property.id)
    setActionMessage(null)
    try {
      const nextStatus = await setOwnerPropertyVisibility(property.id, userId, property.status)
      setProperties((current) =>
        current.map((item) => (item.id === property.id ? { ...item, status: nextStatus } : item)),
      )
      setActionMessage({
        type: 'success',
        text: isPublished ? 'Publicación pausada exitosamente.' : 'Publicación reactivada exitosamente.',
      })
    } catch (err) {
      logSafeEvent({
        module: 'agent_dashboard',
        action: 'toggle_pause_property',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setActionMessage({
        type: 'error',
        text: 'No se pudo cambiar el estado de la publicación. Inténtalo de nuevo.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return {
    properties,
    filteredProperties,
    loading,
    loadError,
    userRole,
    isVerifiedAgent,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    updatingId,
    actionMessage,
    activePropertiesCount,
    totalAccumulatedViews,
    totalContactClicks,
    toggleVisibility,
  }
}
