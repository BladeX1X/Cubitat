export function getNotificationDestination(actionPath: string | null | undefined) {
  if (!actionPath || !actionPath.startsWith('/') || actionPath.startsWith('//')) {
    return null
  }

  try {
    const url = new URL(actionPath, window.location.origin)
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : null
  } catch {
    return null
  }
}
