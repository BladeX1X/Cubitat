export const PUSH_NOTIFICATION_ID_PARAM = 'cubitat_notification'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function safeActionPath(actionPath: unknown, origin: string) {
  if (typeof actionPath !== 'string'
    || !actionPath.startsWith('/')
    || actionPath.startsWith('//')
    || actionPath.includes('\\')) return '/'

  const target = new URL(actionPath, origin)
  if (target.origin !== origin) return '/'
  return `${target.pathname}${target.search}${target.hash}`
}

export function actionPathWithNotification(
  actionPath: unknown,
  notificationId: unknown,
  origin: string,
) {
  const target = new URL(safeActionPath(actionPath, origin), origin)
  if (typeof notificationId === 'string' && UUID_PATTERN.test(notificationId)) {
    target.searchParams.set(PUSH_NOTIFICATION_ID_PARAM, notificationId)
  }
  return `${target.pathname}${target.search}${target.hash}`
}
