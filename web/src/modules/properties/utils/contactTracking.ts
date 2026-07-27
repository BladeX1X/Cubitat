import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export type ContactChannel = 'phone' | 'whatsapp'

export interface ContactMetrics {
  phoneClicks: number
  whatsappClicks: number
}

const VIEWER_KEY_STORAGE = 'cubitat-contact-viewer-key-v1'

function getViewerKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(VIEWER_KEY_STORAGE)
    if (stored) return stored
    const viewerKey = crypto.randomUUID()
    window.localStorage.setItem(VIEWER_KEY_STORAGE, viewerKey)
    return viewerKey
  } catch (err) {
    logSafeEvent({
      module: 'properties',
      action: 'contact_viewer_key',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
    return null
  }
}

export async function trackContactClick(
  propertyId: string,
  channel: ContactChannel,
): Promise<ContactMetrics | null> {
  try {
    const viewerKey = getViewerKey()
    if (!viewerKey) return null

    const { data, error } = await supabase.rpc('increment_contact_clicks', {
      p_property_id: propertyId,
      p_channel: channel,
      p_viewer_key: viewerKey,
    })
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null
    return {
      phoneClicks: Number(row.phone_clicks_count) || 0,
      whatsappClicks: Number(row.whatsapp_clicks_count) || 0,
    }
  } catch (err) {
    logSafeEvent({
      module: 'properties',
      action: 'track_contact_click',
      level: 'info',
      code: sanitizeErrorReason(err),
    })
    return null
  }
}
