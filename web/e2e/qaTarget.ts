const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function parseTarget(value: string, name: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} debe ser una URL válida.`)
  }
  if (url.username || url.password || url.hash) {
    throw new Error(`${name} no puede contener credenciales ni fragmentos.`)
  }
  return url
}

function isLoopback(url: URL): boolean {
  return LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
}

function isSecure(url: URL, loopback: boolean): boolean {
  return url.protocol === 'https:' || (loopback && url.protocol === 'http:')
}

/** Mutation flows that create/delete business data must never target hosted services. */
export function assertLocalMutationTarget(appTarget: string, supabaseTarget: string): void {
  const app = parseTarget(appTarget, 'CUBITAT_E2E_BASE_URL')
  const supabase = parseTarget(supabaseTarget, 'CUBITAT_E2E_SUPABASE_URL')
  if (!isLoopback(app) || !isLoopback(supabase)) {
    throw new Error('Las pruebas E2E mutables solo pueden ejecutarse contra la app y Supabase locales.')
  }
  if (!isSecure(app, true) || !isSecure(supabase, true)) {
    throw new Error('Los destinos locales E2E deben usar HTTP o HTTPS en loopback.')
  }
}

/** Authorization-boundary probes always stay on loopback, even in cloud-enabled runs. */
export function assertLoopbackSecurityProbeTargets(appTarget: string, supabaseTarget: string): void {
  const app = parseTarget(appTarget, 'CUBITAT_E2E_BASE_URL')
  const supabase = parseTarget(supabaseTarget, 'CUBITAT_E2E_SUPABASE_URL')
  if (!isLoopback(app) || !isLoopback(supabase)) {
    throw new Error('Las pruebas E2E de seguridad están limitadas a destinos loopback locales.')
  }
  if (!isSecure(app, true) || !isSecure(supabase, true)) {
    throw new Error('Los destinos locales E2E deben usar HTTP o HTTPS en loopback.')
  }
}

/** Blocks accidental cloud traffic, insecure targets and mixed local/remote services. */
export function assertSafeQaE2ETarget(appTarget: string, supabaseTarget?: string, allowCloud = false): void {
  const app = parseTarget(appTarget, 'CUBITAT_E2E_BASE_URL')
  const appIsLoopback = isLoopback(app)
  if (!isSecure(app, appIsLoopback)) {
    throw new Error('La suite E2E requiere HTTPS para destinos externos y HTTP solo para loopback.')
  }
  if (!appIsLoopback && !allowCloud) {
    throw new Error('La suite E2E bloquea destinos externos; define CUBITAT_E2E_ALLOW_CLOUD=true de forma intencional.')
  }

  if (!supabaseTarget) {
    if (!appIsLoopback) throw new Error('Un destino E2E externo requiere CUBITAT_E2E_SUPABASE_URL.')
    return
  }

  const supabase = parseTarget(supabaseTarget, 'CUBITAT_E2E_SUPABASE_URL')
  const supabaseIsLoopback = isLoopback(supabase)
  if (!isSecure(supabase, supabaseIsLoopback)) {
    throw new Error('La suite E2E requiere HTTPS para Supabase remoto y HTTP solo para loopback.')
  }
  if (appIsLoopback !== supabaseIsLoopback) {
    throw new Error('La suite E2E no permite mezclar una app local con Supabase remoto, ni viceversa.')
  }
  if (!supabaseIsLoopback && !allowCloud) {
    throw new Error('La suite E2E bloquea Supabase remoto; define CUBITAT_E2E_ALLOW_CLOUD=true de forma intencional.')
  }
}
