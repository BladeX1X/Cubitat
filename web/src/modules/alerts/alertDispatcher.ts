import type { Property } from '../properties/types'
import { supabase } from '../../shared/lib/supabaseClient'

export interface SavedSearchAlert {
  id: string
  user_id?: string | null
  email?: string | null
  label?: string
  filters?: {
    query?: string
    operations?: string[]
    operation?: string
    propertyType?: string
    zoneId?: string
    priceRange?: string
    bedrooms?: string
    bathrooms?: string
    parking?: string
    minPrice?: number
    maxPrice?: number
    [key: string]: any
  }
  query?: string | null
  operation?: string | null
  property_type?: string | null
  price_range?: string | null
  bedrooms?: string | null
  bathrooms?: string | null
  parking?: string | null
  zoneId?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type SavedSearch = SavedSearchAlert

export interface DispatchOptions {
  resendApiKey?: string
  fromEmail?: string
  fetchFn?: typeof fetch
}

export interface DispatchResult {
  alertId: string
  email: string
  success: boolean
  error?: string
}

export interface DispatchSummary {
  matchedAlerts: SavedSearchAlert[]
  dispatchedCount: number
  results: DispatchResult[]
}

/**
 * Evaluates whether a published property matches the zone, operation,
 * property type, price range, and search query of saved alerts.
 */
export function matchPropertyWithAlerts(
  property: Property,
  savedAlerts: SavedSearchAlert[],
): SavedSearchAlert[] {
  if (!property || !Array.isArray(savedAlerts)) return []

  return savedAlerts.filter((alert) => {
    // Ignore inactive alerts
    if (alert.is_active === false) return false

    const filters = alert.filters || {}

    // 1. Operation matching
    const alertOp = (alert.operation || filters.operations?.[0] || filters.operation || '')
      .toString()
      .trim()
      .toLowerCase()

    if (alertOp && alertOp !== 'all') {
      const propOp = (property.operation || '').toString().trim().toLowerCase()
      const normAlertOp = alertOp === 'renta' ? 'alquiler' : alertOp
      const normPropOp = propOp === 'renta' ? 'alquiler' : propOp
      if (normAlertOp !== normPropOp) return false
    }

    // 2. Property type matching
    const alertType = (alert.property_type || filters.propertyType || '')
      .toString()
      .trim()
      .toLowerCase()

    if (alertType && alertType !== 'all') {
      const propType = (property.propertyType || '').toString().trim().toLowerCase()
      if (alertType !== propType) return false
    }

    // 3. Zone matching
    const alertZone = (alert.zoneId || filters.zoneId || '')
      .toString()
      .trim()
      .toLowerCase()

    if (alertZone && alertZone !== 'all') {
      const propZone = (property.zoneId || '').toString().trim().toLowerCase()
      if (alertZone !== propZone) return false
    }

    // 4. Query / Location matching
    const alertQuery = (alert.query || filters.query || '')
      .toString()
      .trim()
      .toLowerCase()

    if (alertQuery) {
      const searchableText = [
        property.title,
        property.location,
        property.zoneId,
        property.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (!searchableText.includes(alertQuery)) return false
    }

    // 5. Price range matching
    const alertPriceRange = (alert.price_range || filters.priceRange || '')
      .toString()
      .trim()
      .toLowerCase()

    if (alertPriceRange && alertPriceRange !== 'all') {
      const propPrice = property.priceUsd
      if (propPrice === undefined || propPrice === null) return false

      let minPrice = 0
      let maxPrice = Number.POSITIVE_INFINITY

      if (alertPriceRange.includes('-')) {
        const [minStr, maxStr] = alertPriceRange.split('-').map((s) => s.trim())
        if (minStr) {
          const parsedMin = parseFloat(minStr)
          if (!isNaN(parsedMin)) minPrice = parsedMin
        }
        if (maxStr && maxStr !== 'all') {
          const parsedMax = parseFloat(maxStr)
          if (!isNaN(parsedMax)) maxPrice = parsedMax
        }
      } else {
        const parsedSingle = parseFloat(alertPriceRange)
        if (!isNaN(parsedSingle)) maxPrice = parsedSingle
      }

      if (propPrice < minPrice || propPrice > maxPrice) return false
    }

    // 6. Bedrooms / Bathrooms / Parking checks
    const alertBedrooms = alert.bedrooms || filters.bedrooms
    if (alertBedrooms && alertBedrooms !== 'all') {
      const minBeds = parseInt(String(alertBedrooms), 10)
      if (!isNaN(minBeds) && (property.bedrooms ?? 0) < minBeds) return false
    }

    const alertBathrooms = alert.bathrooms || filters.bathrooms
    if (alertBathrooms && alertBathrooms !== 'all') {
      const minBaths = parseInt(String(alertBathrooms), 10)
      if (!isNaN(minBaths) && (property.bathrooms ?? 0) < minBaths) return false
    }

    const alertParking = alert.parking || filters.parking
    if (alertParking && alertParking !== 'all') {
      const minPark = parseInt(String(alertParking), 10)
      if (!isNaN(minPark) && (property.parking ?? 0) < minPark) return false
    }

    return true
  })
}

/**
 * Finds matching saved search alerts for a property and dispatches email notifications
 * using Resend API to all matching subscribers.
 */
export async function dispatchSearchAlertNotifications(
  property: Property,
  savedAlerts?: SavedSearchAlert[],
  options?: DispatchOptions,
): Promise<DispatchSummary> {
  let alertsToEvaluate = savedAlerts

  if (!alertsToEvaluate) {
    try {
      const { data, error } = await supabase
        .from('search_alerts')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.warn('[alertDispatcher] Error loading search_alerts from Supabase:', error)
        alertsToEvaluate = []
      } else {
        alertsToEvaluate = (data ?? []) as SavedSearchAlert[]
      }
    } catch (e) {
      console.warn('[alertDispatcher] Exception fetching active search alerts:', e)
      alertsToEvaluate = []
    }
  }

  const matchedAlerts = matchPropertyWithAlerts(property, alertsToEvaluate)

  if (matchedAlerts.length === 0) {
    return {
      matchedAlerts: [],
      dispatchedCount: 0,
      results: [],
    }
  }

  const apiKey =
    options?.resendApiKey ||
    (typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined) ||
    (import.meta as any)?.env?.VITE_RESEND_API_KEY

  const fetchImplementation = options?.fetchFn || globalThis.fetch
  const fromAddress = options?.fromEmail || 'Cubitat <notificaciones@cubitathome.com>'

  const results: DispatchResult[] = []

  for (const alert of matchedAlerts) {
    let emailToNotify = alert.email?.trim()

    if (!emailToNotify && alert.user_id) {
      try {
        const { data: userData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', alert.user_id)
          .single()
        if (userData?.email) {
          emailToNotify = userData.email
        }
      } catch {
        // Fallback if profiles lookup fails
      }
    }

    if (!emailToNotify) {
      results.push({
        alertId: alert.id,
        email: '',
        success: false,
        error: 'No recipient email configured for alert',
      })
      continue
    }

    if (!apiKey) {
      results.push({
        alertId: alert.id,
        email: emailToNotify,
        success: false,
        error: 'Missing Resend API key',
      })
      continue
    }

    try {
      const response = await fetchImplementation('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [emailToNotify],
          subject: `Nueva propiedad coincide con tu búsqueda: ${property.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <h2 style="color: #035f53;">¡Nueva propiedad encontrada en Cubitat!</h2>
              <p>Hola, hemos encontrado una propiedad que coincide con tu alerta <strong>"${alert.label || 'Búsqueda guardada'}"</strong>:</p>
              <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; background: #f9fafb;">
                <h3 style="margin-top: 0; color: #111827;">${property.title}</h3>
                <p style="margin: 4px 0;"><strong>Ubicación:</strong> ${property.location}</p>
                <p style="margin: 4px 0;"><strong>Operación:</strong> ${property.operation}</p>
                <p style="margin: 4px 0;"><strong>Tipo:</strong> ${property.propertyType}</p>
                ${property.priceUsd ? `<p style="margin: 4px 0; color: #035f53; font-weight: bold;">Precio: $${property.priceUsd.toLocaleString()} USD</p>` : ''}
              </div>
              <a href="https://cubitathome.com/properties/${property.id}" style="display: inline-block; background: #035f53; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver propiedad</a>
            </div>
          `,
        }),
      })

      if (response.ok) {
        results.push({
          alertId: alert.id,
          email: emailToNotify,
          success: true,
        })
      } else {
        const errorText = await response.text().catch(() => response.statusText)
        results.push({
          alertId: alert.id,
          email: emailToNotify,
          success: false,
          error: `Resend API error (${response.status}): ${errorText}`,
        })
      }
    } catch (err: any) {
      results.push({
        alertId: alert.id,
        email: emailToNotify,
        success: false,
        error: err?.message || 'Network error sending notification email',
      })
    }
  }

  const dispatchedCount = results.filter((r) => r.success).length

  return {
    matchedAlerts,
    dispatchedCount,
    results,
  }
}
