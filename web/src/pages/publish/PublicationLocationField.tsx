import { lazy, Suspense } from 'react'
import { MapPin } from 'lucide-react'

const AddressMap = lazy(() => import('../../modules/maps/components/AddressMap').then((module) => ({ default: module.AddressMap })))

type PublicationLocationFieldProps = {
  province: string
  municipality: string
  latitude: number | null
  longitude: number | null
  onCoordinatesChange: (latitude: number, longitude: number) => void
  onClear: () => void
}

export function PublicationLocationField({ province, municipality, latitude, longitude, onCoordinatesChange, onClear }: PublicationLocationFieldProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:p-5">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 shrink-0 text-emerald-800" size={20} />
          <div>
            <h2 className="font-bold text-neutral-900">Ubicación aproximada</h2>
            <p className="mt-1 text-sm leading-5 text-neutral-600">Marca la zona en el mapa. La ubicación pública se mostrará aproximada para proteger tu privacidad.</p>
          </div>
        </div>
        {latitude !== null && longitude !== null ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span className="text-sm font-medium text-emerald-900">Ubicación marcada</span>
            <button type="button" onClick={onClear} className="ml-auto text-sm font-semibold text-emerald-800 underline">Quitar</button>
          </div>
        ) : <p className="text-sm text-neutral-500">Selecciona un punto para añadir coordenadas.</p>}
      </div>
      <Suspense fallback={<div className="flex min-h-[280px] items-center justify-center rounded-xl border border-neutral-200 bg-white text-sm text-neutral-500">Cargando mapa…</div>}>
        <AddressMap province={province} municipality={municipality} latitude={latitude} longitude={longitude} onCoordinatesChange={onCoordinatesChange} />
      </Suspense>
    </div>
  )
}
