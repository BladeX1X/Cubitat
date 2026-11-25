import { lazy, Suspense, useState } from 'react'
import { Crosshair, MapPin } from 'lucide-react'
import { cubanMunicipalities, cubanProvinces } from '../../shared/data/cubaLocations'

const AddressMap = lazy(() => import('../../modules/maps/components/AddressMap').then((module) => ({ default: module.AddressMap })))

type PublicationLocationFieldProps = {
  province: string
  municipality: string
  latitude: number | null
  longitude: number | null
  onProvinceChange: (province: string) => void
  onMunicipalityChange: (municipality: string) => void
  onCoordinatesChange: (latitude: number, longitude: number) => void
  onClear: () => void
}

export function PublicationLocationField({ province, municipality, latitude, longitude, onProvinceChange, onMunicipalityChange, onCoordinatesChange, onClear }: PublicationLocationFieldProps) {
  const [locationStatus, setLocationStatus] = useState('')
  const [locationError, setLocationError] = useState('')
  const municipalities = province ? cubanMunicipalities[province] ?? [] : []
  const showMap = Boolean((province && municipality) || (latitude !== null && longitude !== null))

  function useDeviceLocation() {
    setLocationStatus('')
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Este navegador no permite obtener la ubicación del dispositivo.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCoordinatesChange(position.coords.latitude, position.coords.longitude)
        setLocationStatus('Ubicación del dispositivo marcada. Puedes ajustar el punto en el mapa.')
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'El acceso a la ubicación está bloqueado. Permítelo en la configuración del sitio del navegador y vuelve a intentarlo.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'No se pudo determinar la ubicación del dispositivo. Puedes marcarla en el mapa.'
            : 'La ubicación tardó demasiado. Inténtalo de nuevo o marca el punto en el mapa.')
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  }

  return (
    <section aria-labelledby="publication-location-title" className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:col-span-2 sm:p-5">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 shrink-0 text-emerald-800" size={20} />
        <div>
          <h2 id="publication-location-title" className="font-bold text-neutral-900">Ubicación aproximada</h2>
          <p className="mt-1 text-sm leading-5 text-neutral-600">Selecciona la provincia y el municipio para centrar el mapa. La ubicación pública se mostrará aproximada para proteger tu privacidad.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-neutral-800">Provincia
          <select value={province} onChange={(event) => { onProvinceChange(event.target.value); onMunicipalityChange('') }} required className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 font-normal">
            <option value="">Selecciona una provincia</option>
            {cubanProvinces.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-neutral-800">Municipio
          <select value={municipality} onChange={(event) => onMunicipalityChange(event.target.value)} required disabled={!province || municipalities.length === 0} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 font-normal disabled:bg-neutral-100 disabled:text-neutral-500">
            <option value="">{province ? 'Selecciona un municipio' : 'Primero selecciona una provincia'}</option>
            {municipalities.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={useDeviceLocation} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-800 bg-white px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          <Crosshair size={17} /> Usar mi ubicación
        </button>
        <span className="text-xs text-neutral-500">El navegador solicitará permiso para acceder a tu ubicación.</span>
      </div>
      {locationStatus && <p role="status" className="text-sm text-emerald-800">{locationStatus}</p>}
      {locationError && <p role="alert" className="text-sm text-red-700">{locationError}</p>}

      {latitude !== null && longitude !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <span className="text-sm font-medium text-emerald-900">Ubicación marcada</span>
          <button type="button" onClick={() => { onClear(); setLocationStatus('') }} className="ml-auto text-sm font-semibold text-emerald-800 underline">Quitar</button>
        </div>
      )}

      {showMap ? (
        <Suspense fallback={<div className="flex min-h-[280px] items-center justify-center rounded-xl border border-neutral-200 bg-white text-sm text-neutral-500">Cargando mapa…</div>}>
          <AddressMap province={province} municipality={municipality} latitude={latitude} longitude={longitude} onCoordinatesChange={onCoordinatesChange} />
        </Suspense>
      ) : <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-600">Selecciona una provincia y un municipio para mostrar el mapa.</p>}
    </section>
  )
}
