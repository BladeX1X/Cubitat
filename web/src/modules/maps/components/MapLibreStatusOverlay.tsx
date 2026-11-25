import { LoaderCircle } from 'lucide-react'
import type { MapLibreLoadStatus } from '../hooks/useMapLibreMap'

export function MapLibreStatusOverlay({
  status,
  onRetry,
  errorHint = 'Comprueba tu conexión e inténtalo de nuevo.',
}: {
  status: MapLibreLoadStatus
  onRetry: () => void
  errorHint?: string
}) {
  if (status === 'ready') return null

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-neutral-100/90 px-6 text-center">
      {status === 'loading' ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 font-medium text-neutral-700">
          <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
          <span>Cargando mapa…</span>
        </div>
      ) : (
        <div role="alert" className="max-w-sm">
          <p className="font-semibold text-neutral-800">No se pudo cargar el mapa</p>
          <p className="mt-1 text-sm text-neutral-600">{errorHint}</p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            onClick={onRetry}
          >
            Reintentar mapa
          </button>
        </div>
      )}
    </div>
  )
}
