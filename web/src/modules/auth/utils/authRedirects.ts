type AuthRedirectPath =
  | '/auth/callback'
  | '/auth/callback?flow=oauth'
  | '/recuperar-contrasena'

export function getAuthRedirectUrl(path: AuthRedirectPath) {
  const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()

  if (publicSiteUrl) {
    return `${publicSiteUrl.replace(/\/$/, '')}${path}`
  }

  if (typeof window === 'undefined') {
    return path
  }

  return `${window.location.origin}${path}`
}
