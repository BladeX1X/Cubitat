export function isPhaseTwoEnabled(isDevelopment: boolean, supabaseUrl: string, isPhaseTwoBuild = false): boolean {
  if ((!isDevelopment && !isPhaseTwoBuild) || !supabaseUrl) return false

  try {
    const hostname = new URL(supabaseUrl).hostname
    return isPhaseTwoBuild || hostname === '127.0.0.1' || hostname === 'localhost'
  } catch {
    return false
  }
}

/**
 * Fase 2 es experimental: solo se habilita localmente o en el build explícito
 * de pruebas que define VITE_PHASE2_UI_ENABLED=true.
 */
export const PHASE_TWO_ENABLED = isPhaseTwoEnabled(
  import.meta.env.DEV,
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_PHASE2_UI_ENABLED === 'true',
)

/** Image duplicate moderation is available in the dedicated DEV Phase 2 profile. */
export const IMAGE_DUPLICATE_MODERATION_ENABLED = import.meta.env.DEV
  || import.meta.env.VITE_IMAGE_DUPLICATE_MODERATION_ENABLED === 'true'
