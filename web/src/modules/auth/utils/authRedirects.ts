type AuthRedirectPath =
  | '/auth/callback'
  | '/auth/callback?flow=oauth'
  | '/recuperar-contrasena'

export function getAuthRedirectUrl(path: AuthRedirectPath) {
  if (typeof window === 'undefined') {
    return path
  }

  return `${window.location.origin}${path}`
}
