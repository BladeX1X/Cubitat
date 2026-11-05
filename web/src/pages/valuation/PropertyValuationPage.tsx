import { useState, type FormEvent } from 'react'
import { Calculator, MapPin, Ruler } from 'lucide-react'
import { estimatePropertyValue } from '../../modules/valuation/valuation'
import { propertyComparableSource } from '../../modules/valuation/comparableSource'
import type { ValuationEstimate, ValuationInput } from '../../modules/valuation/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'

type PropertyValuationPageProps = { authenticated: boolean; onRequireLogin: () => void }

const inputClass = 'mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm'

export function PropertyValuationPage({ authenticated, onRequireLogin }: PropertyValuationPageProps) {
  const [propertyType, setPropertyType] = useState<ValuationInput['propertyType']>('casa')
  const [operation, setOperation] = useState<ValuationInput['operation']>('venta')
  const [location, setLocation] = useState('')
  const [areaM2, setAreaM2] = useState('')
  const [estimate, setEstimate] = useState<ValuationEstimate | null>(null)
  const [loading, setLoading] = useState(false)
  const [insufficient, setInsufficient] = useState(false)
  const [error, setError] = useState(false)

  useSEO({ title: 'Valoración orientativa | Cubitat', description: 'Consulta una referencia de precio basada en anuncios publicados comparables en Cubitat.' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authenticated) { onRequireLogin(); return }
    const parsedArea = Number(areaM2)
    if (!location.trim() || location.trim().length > 120 || !Number.isFinite(parsedArea) || parsedArea < 10 || parsedArea > 10000) return
    setLoading(true)
    setError(false)
    setInsufficient(false)
    setEstimate(null)
    try {
      const result = await estimatePropertyValue(propertyComparableSource, { propertyType, operation, location: location.trim(), areaM2: parsedArea })
      if (result) setEstimate(result)
      else setInsufficient(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><Calculator size={17} />Estimación basada en anuncios</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-900 sm:text-4xl">Valoración orientativa</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">Comparamos anuncios publicados de inmuebles similares. Necesitamos al menos cinco comparables para mostrar una referencia.</p>
        {!authenticated ? <section className="mt-7 rounded-2xl border border-neutral-200 bg-white p-6"><h2 className="font-bold">Inicia sesión para consultar</h2><p className="mt-2 text-sm text-neutral-600">El resultado y los comparables se muestran solo durante esta consulta y no se guardan en tu cuenta.</p><Button className="mt-4" onClick={onRequireLogin}>Iniciar sesión</Button></section> : <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
          <label className="text-sm font-semibold">Tipo de inmueble<select className={inputClass} value={propertyType} onChange={(event) => setPropertyType(event.target.value as ValuationInput['propertyType'])}><option value="casa">Casa</option><option value="apartamento">Apartamento</option><option value="terreno">Terreno</option></select></label>
          <label className="text-sm font-semibold">Operación<select className={inputClass} value={operation} onChange={(event) => setOperation(event.target.value as ValuationInput['operation'])}><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></label>
          <label className="text-sm font-semibold">Zona aproximada<input required minLength={2} maxLength={120} className={inputClass} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Municipio o provincia" /></label>
          <label className="text-sm font-semibold">Área aproximada (m²)<input required type="number" min={10} max={10000} step="0.1" className={inputClass} value={areaM2} onChange={(event) => setAreaM2(event.target.value)} placeholder="Ej. 85" /></label>
          <div className="sm:col-span-2"><Button type="submit" disabled={loading} className="min-h-11">{loading ? 'Buscando comparables…' : 'Calcular referencia'}</Button></div>
        </form>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudo consultar la referencia. Inténtalo de nuevo.</p>}
        {insufficient && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aún no hay cinco anuncios suficientemente parecidos en esa zona. No mostraremos una cifra con una muestra pequeña.</p>}
        {estimate && <section aria-live="polite" className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">Referencia central · {operation === 'alquiler' ? 'mensual' : 'venta'}</p>
          <p className="mt-2 text-4xl font-black text-neutral-900">{new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(estimate.medianUsd)}</p>
          <p className="mt-2 text-sm text-neutral-600">Mediana de {estimate.comparables.length} anuncios publicados similares. Método: mediana de precio por m² multiplicada por el área que indicaste ({new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(estimate.medianPricePerM2)}/m²) · Consultada {new Date(estimate.estimatedAt).toLocaleDateString('es')}</p>
          <h2 className="mt-6 font-bold">Muestra comparada</h2>
          <ul className="mt-2 divide-y divide-neutral-100">{estimate.comparables.map((item, index) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="flex items-center gap-2 text-neutral-600"><span className="font-semibold text-neutral-800">Anuncio {index + 1}</span><span>·</span><span className="inline-flex items-center gap-1"><Ruler size={14} />{item.areaM2} m²</span><span>·</span><span className="inline-flex items-center gap-1"><MapPin size={14} />Zona coincidente</span></span><strong>{new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.priceUsd)}</strong></li>)}</ul>
          <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">Es una referencia estadística basada en precios declarados por anunciantes; no es avalúo profesional, garantía, asesoría financiera ni oferta. El alquiler puede variar por período y condiciones.</p>
        </section>}
      </div>
    </main>
  )
}
