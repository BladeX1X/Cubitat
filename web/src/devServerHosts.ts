const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function isExactHostname(hostname: string): boolean {
  if (hostname.length > 253 || hostname.startsWith('.') || hostname.endsWith('.')) {
    return false
  }

  return hostname.split('.').every((label) => HOST_LABEL.test(label))
}

/** Keep Vite closed by default; extra tunnel hosts must be exact DNS names. */
export function getDevServerAllowedHosts(additionalHosts: string | undefined): string[] {
  const validatedHosts = (additionalHosts ?? '')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(isExactHostname)

  return [...new Set(['localhost', '127.0.0.1', ...validatedHosts])]
}
