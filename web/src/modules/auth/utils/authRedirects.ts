type AuthRedirectPath =
  | '/auth/callback'
  | '/auth/callback?flow=oauth'
  | '/recuperar-contrasena'

const AUTH_REDIRECT_STORAGE_KEY = 'cubitat_auth_redirect_next'
const AUTH_REDIRECT_TTL_MS = 15 * 60 * 1000

type StoredAuthRedirect = {
  path: string
  createdAt: number
}

export function normalizeAuthReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null

  try {
    const parsed = new URL(value, 'https://cubitathome.local')
    if (parsed.origin !== 'https://cubitathome.local') return null
    if (parsed.pathname.startsWith('/auth/') || parsed.pathname.startsWith('/recuperar-contrasena')) {
      return null
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export function storeAuthReturnPath(path: string, now = Date.now()) {
  const safePath = normalizeAuthReturnPath(path)
  if (!safePath || typeof window === 'undefined') return false

  const value: StoredAuthRedirect = { path: safePath, createdAt: now }
  window.localStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, JSON.stringify(value))
  return true
}

export function clearAuthReturnPath() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
  }
}

export function consumeAuthReturnPath(now = Date.now()) {
  if (typeof window === 'undefined') return null

  const rawValue = window.localStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)
  clearAuthReturnPath()
  if (!rawValue) return null

  try {
    const stored = JSON.parse(rawValue) as Partial<StoredAuthRedirect>
    if (typeof stored.createdAt !== 'number' || now - stored.createdAt > AUTH_REDIRECT_TTL_MS) {
      return null
    }
    return normalizeAuthReturnPath(stored.path)
  } catch {
    // Compatibilidad defensiva: descarta valores antiguos o manipulados.
    return null
  }
}

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
