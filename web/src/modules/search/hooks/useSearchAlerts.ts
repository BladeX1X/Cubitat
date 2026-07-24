import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'
import type { SearchFilters } from '../types'

export type SearchAlert = {
  id: string
  user_id: string
  label: string
  filters: SearchFilters
  query: string | null
  operation: string | null
  property_type: string | null
  price_range: string | null
  bedrooms: string | null
  bathrooms: string | null
  parking: string | null
  is_active: boolean
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

type SearchAlertPayload = {
  user_id: string
  label: string
  filters: SearchFilters
  query: string | null
  operation: string | null
  property_type: string | null
  price_range: string | null
  bedrooms: string | null
  bathrooms: string | null
  parking: string | null
}

const operationLabels: Record<string, string> = {
  venta: 'venta',
  alquiler: 'renta',
  permuta: 'permuta',
}

const propertyTypeLabels: Record<string, string> = {
  casa: 'Casas',
  apartamento: 'Apartamentos',
  habitacion: 'Habitaciones',
  local: 'Locales',
  terreno: 'Terrenos',
}

function valueToText(value: SearchFilters[keyof SearchFilters] | undefined) {
  if (value === undefined || value === null || value === 'all') return null
  if (Array.isArray(value)) return value.join(',')
  return String(value)
}

export function buildSearchAlertLabel(filters: SearchFilters) {
  const propertyText =
    filters.propertyType && filters.propertyType !== 'all'
      ? propertyTypeLabels[filters.propertyType] ?? 'Propiedades'
      : 'Propiedades'
  const operation = filters.operations[0]
  const operationText = operation ? ` en ${operationLabels[operation] ?? operation}` : ''
  const locationText = filters.query?.trim() ? ` en ${filters.query.trim()}` : ' en Cuba'
  const details = [
    filters.bedrooms && filters.bedrooms !== 'all' ? `${filters.bedrooms}+ hab.` : null,
    filters.priceRange && filters.priceRange !== 'all' ? `precio ${filters.priceRange}` : null,
  ].filter(Boolean)

  return `${propertyText}${operationText}${locationText}${details.length ? ` (${details.join(', ')})` : ''}`
}

function buildPayload(userId: string, filters: SearchFilters, label?: string): SearchAlertPayload {
  return {
    user_id: userId,
    label: label?.trim() || buildSearchAlertLabel(filters),
    filters,
    query: filters.query?.trim() || null,
    operation: filters.operations[0] ?? null,
    property_type: filters.propertyType === 'all' ? null : filters.propertyType,
    price_range: valueToText(filters.priceRange),
    bedrooms: valueToText(filters.bedrooms),
    bathrooms: valueToText(filters.bathrooms),
    parking: valueToText(filters.parking),
  }
}

export function useSearchAlerts(userId?: string | null) {
  const [alerts, setAlerts] = useState<SearchAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    if (!userId) {
      setAlerts([])
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: loadError } = await supabase
      .from('search_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (loadError) {
      setError('No se pudieron cargar tus alertas.')
      return
    }

    setAlerts((data ?? []) as SearchAlert[])
  }, [userId])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const createAlert = useCallback(async (filters: SearchFilters, label?: string) => {
    setCreating(true)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const currentUser = sessionData.session?.user

    if (sessionError || !currentUser) {
      setCreating(false)
      setError('Inicia sesion para guardar esta alerta.')
      throw new Error('Unauthenticated search alert')
    }

    const payload = buildPayload(currentUser.id, filters, label)
    const { data, error: insertError } = await supabase
      .from('search_alerts')
      .insert(payload)
      .select('*')
      .single()

    setCreating(false)

    if (insertError) {
      setError('No se pudo crear la alerta.')
      throw insertError
    }

    const alert = data as SearchAlert
    if (!userId || userId === currentUser.id) {
      setAlerts((current) => [alert, ...current])
    }

    return alert
  }, [userId])

  const deleteAlert = useCallback(async (alertId: string) => {
    setError(null)
    const { error: deleteError } = await supabase
      .from('search_alerts')
      .delete()
      .eq('id', alertId)

    if (deleteError) {
      setError('No se pudo eliminar la alerta.')
      throw deleteError
    }

    setAlerts((current) => current.filter((alert) => alert.id !== alertId))
  }, [])

  return {
    alerts,
    loading,
    creating,
    error,
    createAlert,
    deleteAlert,
    reload: loadAlerts,
  }
}
