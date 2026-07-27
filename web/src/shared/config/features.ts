export function isPhaseTwoEnabled(isDevelopment: boolean, supabaseUrl: string): boolean {
  if (!isDevelopment || !supabaseUrl) return false

  try {
    const hostname = new URL(supabaseUrl).hostname
    return hostname === '127.0.0.1' || hostname === 'localhost'
  } catch {
    return false
  }
}

/**
 * Fase 2 es experimental y solo puede ejecutarse con el servidor Vite en DEV.
 * Un build de producción siempre la elimina de la navegación y de las consultas.
 */
export const PHASE_TWO_ENABLED = isPhaseTwoEnabled(
  import.meta.env.DEV,
  import.meta.env.VITE_SUPABASE_URL || '',
)
