type NavigatorWithStandalone = Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'> & {
  standalone?: boolean
}

type InstalledRelatedApp = {
  id?: string
  platform?: string
  url?: string
}

type NavigatorWithInstalledRelatedApps = NavigatorWithStandalone & {
  getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>
}

const CUBITAT_ORIGINS = new Set([
  'https://cubitathome.com',
  ...(import.meta.env.MODE === 'phase2-dev' || import.meta.env.MODE === 'phase2-agents'
    ? ['https://cubitat1-phase2-dev.pochiprats18.workers.dev']
    : []),
])

function getOrigin(value?: string) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function isIOSDevice(navigatorObject: NavigatorWithStandalone = window.navigator) {
  const userAgent = navigatorObject.userAgent.toLowerCase()
  const isClassicIOS = /iphone|ipad|ipod/.test(userAgent)
  const isIPadDesktopMode = /macintosh/.test(userAgent) && navigatorObject.maxTouchPoints > 1

  return isClassicIOS || isIPadDesktopMode
}

export function isAndroidDevice(navigatorObject: NavigatorWithStandalone = window.navigator) {
  return /android/.test(navigatorObject.userAgent.toLowerCase())
}

export async function hasInstalledRelatedWebApp(
  navigatorObject: NavigatorWithInstalledRelatedApps = window.navigator,
) {
  if (!navigatorObject.getInstalledRelatedApps) return false

  try {
    const installedApps = await navigatorObject.getInstalledRelatedApps()
    const currentOrigin = window.location.origin

    return installedApps.some((app) => {
      if (app.platform !== 'webapp') return false

      return [app.id, app.url]
        .map(getOrigin)
        .some((origin) => origin === currentOrigin || (origin !== null && CUBITAT_ORIGINS.has(origin)))
    })
  } catch {
    return false
  }
}

export function isStandalonePWA(
  navigatorObject: NavigatorWithStandalone = window.navigator,
  referrer = document.referrer,
) {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || navigatorObject.standalone === true
    || referrer.includes('android-app://')
}
