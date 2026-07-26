import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export type ContactChannel = 'phone' | 'whatsapp'

export interface ContactMetrics {
  phoneClicks: number
  whatsappClicks: number
}

const STORAGE_KEY = 'cubitat-contact-clicks-v1'

function getLocalClickStore(): Record<string, ContactMetrics> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalClickStore(store: Record<string, ContactMetrics>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (err) {
    logSafeEvent({
      module: 'properties',
      action: 'save_local_store',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
  }
}

export function getContactClickMetrics(propertyId: string): ContactMetrics {
  const store = getLocalClickStore()
  return store[propertyId] || { phoneClicks: 0, whatsappClicks: 0 }
}

export async function trackContactClick(
  propertyId: string,
  channel: ContactChannel,
): Promise<ContactMetrics> {
  // 1. Update local storage state for immediate responsiveness
  const store = getLocalClickStore()
  const current = store[propertyId] || { phoneClicks: 0, whatsappClicks: 0 }
  const nextMetrics: ContactMetrics = {
    phoneClicks: channel === 'phone' ? current.phoneClicks + 1 : current.phoneClicks,
    whatsappClicks: channel === 'whatsapp' ? current.whatsappClicks + 1 : current.whatsappClicks,
  }
  store[propertyId] = nextMetrics
  saveLocalClickStore(store)

  // 2. Fire and forget database sync
  try {
    await supabase.rpc('increment_contact_clicks', {
      p_property_id: propertyId,
      p_channel: channel,
    })
  } catch (err) {
    logSafeEvent({
      module: 'properties',
      action: 'track_contact_click',
      level: 'info',
      code: sanitizeErrorReason(err),
    })
  }

  return nextMetrics
}
