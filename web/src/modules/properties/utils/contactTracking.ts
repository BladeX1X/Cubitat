import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export type ContactChannel = 'phone' | 'whatsapp'

export interface ContactMetrics {
  phoneClicks: number
  whatsappClicks: number
}

export async function trackContactClick(
  propertyId: string,
  channel: ContactChannel,
): Promise<ContactMetrics | null> {
  try {
    const response = await fetch('/api/phase2/contact-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, channel }),
    })
    if (!response.ok) throw new Error(`contact_metric_${response.status}`)

    const row = await response.json() as {
      phone_clicks_count?: number | string
      whatsapp_clicks_count?: number | string
    }
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
