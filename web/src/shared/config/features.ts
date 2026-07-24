export function isPhaseTwoEnabled(isDevelopment: boolean): boolean {
  return isDevelopment
}

/**
 * Fase 2 es experimental y solo puede ejecutarse con el servidor Vite en DEV.
 * Un build de producción siempre la elimina de la navegación y de las consultas.
 */
export const PHASE_TWO_ENABLED = isPhaseTwoEnabled(import.meta.env.DEV)
