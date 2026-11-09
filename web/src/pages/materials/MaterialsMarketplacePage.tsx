import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Boxes, Map, MapPin, PackageSearch } from 'lucide-react'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MarketplaceContactActions } from '../../shared/ui/MarketplaceContactActions'
import { fetchMaterialListing, fetchMaterialListings, fetchMaterialProvinceCounts, sendMaterialInquiry } from '../../modules/materials/materialRepository'
import type { ProvinceCount } from '../../modules/marketplace/provinceAggregates'
import { ProvinceMapStatus } from '../../modules/marketplace/ProvinceMapStatus'
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, type MaterialCategory, type MaterialListing } from '../../modules/materials/types'
import { cubanProvinces } from '../../shared/data/cubaLocations'

const ProvinceAggregateMap = lazy(() => import('../../modules/marketplace/ProvinceAggregateMap').then((module) => ({ default: module.ProvinceAggregateMap })))

type MaterialsMarketplacePageProps = {
  onRequireLogin: () => void
  onCreateListing: () => void
  onManageListings: () => void
}

function getSlugFromPath(): string | null {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts.length <= 1 || parts[0] !== 'materiales') return null
  try { return decodeURIComponent(parts[1]) } catch { return null }
}

function formatPrice(item: MaterialListing) {
  if (item.price == null) return 'Consultar precio'
  if (item.currency === 'MIXED') return `${item.price.toLocaleString('es')} · precio variable`
  return new Intl.NumberFormat('es', { style: 'currency', currency: item.currency, maximumFractionDigits: 2 }).format(item.price)
}

function availabilityLabel(value: MaterialListing['availability']) {
  switch (value) {
    case 'available': return 'Disponible según anunciante'
    case 'limited': return 'Disponibilidad limitada'
    case 'made_to_order': return 'Por encargo'
    case 'out_of_stock': return 'Agotado'
  }
}

export function MaterialsMarketplacePage({ onRequireLogin, onCreateListing, onManageListings }: MaterialsMarketplacePageProps) {
  const [slug, setSlug] = useState<string | null>(getSlugFromPath)
  const [category, setCategory] = useState<MaterialCategory | ''>('')
  const [province, setProvince] = useState('')
  const [availability, setAvailability] = useState<Exclude<MaterialListing['availability'], 'out_of_stock'> | ''>('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [listings, setListings] = useState<MaterialListing[]>([])
  const [listing, setListing] = useState<MaterialListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [message, setMessage] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [mapOpen, setMapOpen] = useState(false)
  const [provinceCounts, setProvinceCounts] = useState<ProvinceCount[]>([])
  const [provinceCountsLoading, setProvinceCountsLoading] = useState(false)
  const [provinceCountsError, setProvinceCountsError] = useState(false)

  useSEO({
    title: listing ? `${listing.title} | Materiales para el hogar` : 'Materiales para construcción y reparación | Cubitat',
    description: listing?.description || 'Explora materiales para construir, reparar y mejorar tu vivienda en Cuba.',
  })

  useEffect(() => {
    function syncPath() { setSlug(getSlugFromPath()) }
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    setListing(null)
    if (!slug) {
      void fetchMaterialListings({ category: category || undefined, province: province || undefined, availability: availability || undefined, search, offset })
        .then(({ items, total: resultCount }) => { if (active) { setListings((current) => offset === 0 ? items : [...current, ...items]); setTotal(resultCount) } })
        .catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) setLoading(false) })
    } else {
      void fetchMaterialListing(slug)
        .then((item) => { if (active) setListing(item) })
        .catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false }
  }, [slug, category, province, availability, search, offset])

  useEffect(() => {
    if (slug || !mapOpen) return
    let active = true
    setProvinceCountsLoading(true)
    setProvinceCountsError(false)
    void fetchMaterialProvinceCounts({ category: category || undefined, availability: availability || undefined, search })
      .then((counts) => { if (active) setProvinceCounts(counts) })
      .catch(() => { if (active) setProvinceCountsError(true) })
      .finally(() => { if (active) setProvinceCountsLoading(false) })
    return () => { active = false }
  }, [slug, mapOpen, category, availability, search])

  function openListing(item: MaterialListing) {
    window.history.pushState(null, '', `/materiales/${encodeURIComponent(item.slug)}`)
    setSlug(item.slug)
    setSubmitState('idle')
    window.scrollTo({ top: 0 })
  }

  function backToCatalog() {
    window.history.pushState(null, '', '/materiales')
    setSlug(null)
    setSubmitState('idle')
    window.scrollTo({ top: 0 })
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!listing) return
    const trimmed = message.trim()
    if (trimmed.length < 10 || trimmed.length > 3000) return
    setSubmitState('sending')
    try {
      await sendMaterialInquiry(listing.id, trimmed)
      setMessage('')
      setSubmitState('sent')
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') onRequireLogin()
      setSubmitState('error')
    }
  }

  if (loading) return <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-12" aria-label="Cargando materiales"><div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-neutral-200" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 rounded-2xl bg-neutral-200" />)}</div></div></main>
  if (loadError) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">No se pudo cargar el catálogo</h1><p className="mt-2 text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => window.location.reload()}>Reintentar</Button></main>

  if (slug) {
    if (!listing) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Anuncio no disponible</h1><p className="mt-2 text-neutral-600">Este material no existe o ya no está publicado.</p><Button className="mt-5" onClick={backToCatalog}>Volver al catálogo</Button></main>
    return (
      <main className="min-h-[75vh] bg-neutral-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <button type="button" onClick={backToCatalog} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white hover:text-neutral-900"><ArrowLeft size={18} />Volver al catálogo</button>
          <section className="grid gap-7 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 md:grid-cols-[1.1fr_1fr]">
            <div className="overflow-hidden rounded-2xl bg-neutral-100">
              {listing.photoUrls[0] ? <img src={listing.photoUrls[0]} alt={listing.title} className="h-72 w-full object-cover sm:h-[420px]" /> : <div className="flex h-72 flex-col items-center justify-center gap-2 text-neutral-400 sm:h-[420px]"><Boxes size={56} />{listing.photoUnavailable && <p role="status" className="px-4 text-center text-sm text-neutral-700">Las fotos no están disponibles temporalmente.</p>}</div>}
              {listing.photoUrls.length > 1 && <div className="mt-1 grid grid-cols-3 gap-1">{listing.photoUrls.slice(1, 4).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${listing.title}, foto ${index + 2}`} loading="lazy" className="h-24 w-full object-cover" />)}</div>}
              {listing.photoUrls.length > 0 && listing.photoUnavailable && <p role="status" className="p-2 text-center text-sm text-amber-900">Algunas fotos no están disponibles temporalmente.</p>}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">{MATERIAL_CATEGORY_LABELS[listing.category]}</p>
              <h1 className="mt-2 text-3xl font-black text-neutral-900">{listing.title}</h1>
              <p className="mt-4 text-2xl font-extrabold text-emerald-800">{formatPrice(listing)}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600"><MapPin size={16} />{listing.province}</p>
              <p className="mt-3 text-sm font-semibold text-neutral-700">{availabilityLabel(listing.availability)}</p>
              <p className="mt-6 whitespace-pre-line leading-7 text-neutral-700">{listing.description}</p>
              <p className="mt-4 text-xs text-neutral-500">Precio y disponibilidad son declarados por el vendedor; consúltalos antes de trasladarte. Este anuncio no constituye reserva ni garantía de inventario.</p>
              <div className="mt-6"><MarketplaceContactActions listingType="material" listingId={listing.id} label="Ver teléfono o WhatsApp" /></div>
              <form onSubmit={submitInquiry} className="mt-5 space-y-3 rounded-2xl bg-neutral-50 p-4">
                <label htmlFor="material-inquiry" className="block text-sm font-bold">Enviar consulta al vendedor</label>
                <textarea id="material-inquiry" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={3000} required rows={3} className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm" placeholder="Pregunta por medidas, precio o disponibilidad…" />
                <Button type="submit" disabled={submitState === 'sending'} className="w-full">{submitState === 'sending' ? 'Enviando…' : 'Enviar consulta'}</Button>
                {submitState === 'sent' && <p role="status" className="text-sm text-emerald-800">Consulta enviada. No crea una orden ni reserva.</p>}
                {submitState === 'error' && <p role="alert" className="text-sm text-red-700">No se pudo enviar. Inicia sesión y vuelve a intentarlo.</p>}
              </form>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className={`mx-auto ${mapOpen ? 'max-w-screen-2xl' : 'max-w-6xl'}`}>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><PackageSearch size={17} />Materiales de construcción</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-900 sm:text-4xl">Materiales para construir y reparar</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">Explora anuncios de vendedores y consulta el precio y la disponibilidad antes de comprar. Cubitat no procesa pagos ni reservas.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button type="button" className="min-h-11" onClick={onCreateListing}>Vender materiales</Button><Button type="button" variant="outline" className="min-h-11" onClick={onManageListings}>Mis anuncios</Button><Button type="button" variant="outline" className="min-h-11" aria-expanded={mapOpen} aria-controls="materials-province-map" onClick={() => setMapOpen((open) => !open)}><Map size={17} className="mr-2" />{mapOpen ? 'Ocultar mapa' : 'Mostrar mapa'}</Button></div>
        <div className={`mt-7 grid gap-5 ${mapOpen ? 'min-[1021px]:grid-cols-[240px_minmax(320px,1fr)_minmax(320px,38%)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}>
          <aside aria-label="Filtros de materiales" className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="text-lg font-bold">Filtrar resultados</h2>
            <label className="block text-sm font-semibold">Buscar material<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); setListings([]) }} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Cemento, tubería…" /></label>
            <label className="block text-sm font-semibold">Categoría<select value={category} onChange={(event) => { setCategory(event.target.value as MaterialCategory | ''); setOffset(0); setListings([]) }} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3"><option value="">Todas las categorías</option>{MATERIAL_CATEGORIES.map((value) => <option key={value} value={value}>{MATERIAL_CATEGORY_LABELS[value]}</option>)}</select></label>
            <label className="block text-sm font-semibold">Provincia<select value={province} onChange={(event) => { setProvince(event.target.value); setOffset(0); setListings([]) }} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3"><option value="">Toda Cuba</option>{cubanProvinces.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <fieldset className="space-y-2"><legend className="text-sm font-semibold">Disponibilidad</legend>{([['', 'Todas'], ['available', 'Disponible'], ['limited', 'Disponibilidad limitada'], ['made_to_order', 'Por encargo']] as const).map(([value, label]) => <label key={value || 'all'} className="flex min-h-9 items-center gap-2 text-sm"><input type="radio" name="material-availability" checked={availability === value} onChange={() => { setAvailability(value); setOffset(0); setListings([]) }} />{label}</label>)}</fieldset>
            {(category || province || availability || search) && <Button type="button" variant="outline" className="w-full" onClick={() => { setCategory(''); setProvince(''); setAvailability(''); setSearch(''); setOffset(0); setListings([]) }}>Limpiar filtros</Button>}
          </aside>
          <div className="min-w-0"><p className="mb-4 text-sm text-neutral-600" aria-live="polite">{total} {total === 1 ? 'anuncio disponible' : 'anuncios disponibles'}</p>
            {listings.length === 0 ? <section className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-14 text-center"><h2 className="text-lg font-bold">No encontramos materiales con esos filtros</h2><p className="mt-2 text-sm text-neutral-600">Prueba otra palabra, categoría o provincia.</p></section> : <section className={`grid gap-5 ${mapOpen ? 'sm:grid-cols-1 min-[1280px]:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'}`} aria-label="Materiales disponibles">{listings.map((item) => <button key={item.id} type="button" onClick={() => openListing(item)} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative h-48 bg-amber-50">{item.photoUrls[0] ? <img src={item.photoUrls[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-amber-800"><Boxes size={36} /></div>}{item.photoUnavailable && <span role="status" className="absolute inset-x-2 bottom-2 rounded-lg bg-white/95 px-2 py-1 text-center text-xs text-amber-900">Fotos no disponibles temporalmente</span>}</div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{MATERIAL_CATEGORY_LABELS[item.category]}</p><h2 className="mt-1 text-lg font-bold text-neutral-900">{item.title}</h2><p className="mt-2 flex items-center gap-1 text-sm text-neutral-600"><MapPin size={15} />{item.province}</p><p className="mt-3 text-lg font-extrabold text-emerald-800">{formatPrice(item)}</p><p className="mt-1 text-xs text-neutral-500">{availabilityLabel(item.availability)}</p><span className="mt-4 inline-flex min-h-10 items-center font-bold text-emerald-800">Ver anuncio →</span></div></button>)}</section>}
            {listings.length < total && <div className="mt-6 text-center"><Button type="button" variant="outline" onClick={() => setOffset(listings.length)} disabled={loading}>{loading ? 'Cargando…' : 'Cargar más anuncios'}</Button></div>}
          </div>
          {mapOpen && <div id="materials-province-map" className="contents" aria-busy={provinceCountsLoading}><Suspense fallback={<ProvinceMapStatus onClose={() => setMapOpen(false)} resultLabel="anuncios de materiales" />}>{provinceCountsError ? <ProvinceMapStatus error onClose={() => setMapOpen(false)} resultLabel="anuncios de materiales" /> : <ProvinceAggregateMap counts={provinceCounts} selectedProvince={province} onClose={() => setMapOpen(false)} onSelectProvince={(nextProvince) => { setProvince((current) => current === nextProvince ? '' : nextProvince); setOffset(0); setListings([]) }} accent="#b45309" resultLabel="anuncios de materiales" />}</Suspense></div>}
        </div>
      </div>
    </main>
  )
}
