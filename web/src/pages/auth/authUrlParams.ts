type AuthUrlParams = {
  code: string | null
  error: string | null
  accessToken: string | null
  refreshToken: string | null
  isOAuthCallback: boolean
}

export function getAuthUrlParams(): AuthUrlParams {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return {
    code: searchParams.get('code') || hashParams.get('code'),
    error:
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    isOAuthCallback: Boolean(
      searchParams.get('flow') === 'oauth' ||
      hashParams.get('flow') === 'oauth' ||
      searchParams.get('state') ||
      hashParams.get('state') ||
      searchParams.get('provider') ||
      hashParams.get('provider'),
    ),
  }
}

export function cleanAuthUrl(pathname = window.location.pathname) {
  window.history.replaceState(null, '', pathname)
}
