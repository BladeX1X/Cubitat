import { supabase } from '../../shared/lib/supabaseClient'

export const PUSH_NOTIFICATION_ID_PARAM = 'cubitat_notification'
export const NOTIFICATION_READ_EVENT = 'cubitat:notification-read'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getPushNotificationId(search: string) {
  const notificationId = new URLSearchParams(search).get(PUSH_NOTIFICATION_ID_PARAM)
  return notificationId && UUID_PATTERN.test(notificationId) ? notificationId : null
}

export function clearPushNotificationId() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(PUSH_NOTIFICATION_ID_PARAM)) return

  url.searchParams.delete(PUSH_NOTIFICATION_ID_PARAM)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) throw error

  window.dispatchEvent(new CustomEvent(NOTIFICATION_READ_EVENT, {
    detail: { notificationId },
  }))
}
