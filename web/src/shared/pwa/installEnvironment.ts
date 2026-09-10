type NavigatorWithStandalone = Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'> & {
  standalone?: boolean
}

export function isIOSDevice(navigatorObject: NavigatorWithStandalone = window.navigator) {
  const userAgent = navigatorObject.userAgent.toLowerCase()
  const isClassicIOS = /iphone|ipad|ipod/.test(userAgent)
  const isIPadDesktopMode = /macintosh/.test(userAgent) && navigatorObject.maxTouchPoints > 1

  return isClassicIOS || isIPadDesktopMode
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
