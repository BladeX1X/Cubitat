import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Boxes, MapPin } from 'lucide-react'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MarketplaceContactActions } from '../../shared/ui/MarketplaceContactActions'
import { MarketplaceCardImage } from '../../shared/ui/MarketplaceCardImage'
import { SaveMarketplaceListingButton } from '../../shared/ui/SaveMarketplaceListingButton'
import { MarketplaceCardActions } from '../../shared/ui/MarketplaceCardActions'
import { CatalogExplorerLayout } from '../../modules/catalog-explorer/CatalogExplorerLayout'
import { CatalogFilterToolbar } from '../../modules/catalog-explorer/CatalogFilterToolbar'
import { CatalogMap } from '../../modules/catalog-explorer/CatalogMap'
import { CatalogPagination, CATALOG_PAGE_SIZE } from '../../modules/catalog-explorer/CatalogPagination'
import { MarketplaceMapToggle } from '../../modules/marketplace/MarketplaceMapToggle'
import { PHASE_FOUR_MAT_ENABLED } from '../../shared/config/features'
import { fetchMaterialListing, fetchMaterialListings, fetchMaterialProvinceCounts, sendMaterialInquiry } from '../../modules/materials/materialRepository'
import type { ProvinceCount } from '../../modules/marketplace/provinceAggregates'
import { ProvinceMapStatus } from '../../modules/marketplace/ProvinceMapStatus'
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, type MaterialCategory, type MaterialListing } from '../../modules/materials/types'
import { isMaterialPhotoPath, MATERIAL_PHOTO_BUCKET } from '../../modules/materials/materialPhotos'
import { cubanProvinces } from '../../shared/data/cubaLocations'
import '../marketplace/MarketplaceDirectoryMap.css'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [listings, setListings] = useState<MaterialListing[]>([])
  const [listing, setListing] = useState<MaterialListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [message, setMessage] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [focusDetailTarget, setFocusDetailTarget] = useState<'inquiry' | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [provinceCounts, setProvinceCounts] = useState<ProvinceCount[]>([])
  const [provinceCountsLoading, setProvinceCountsLoading] = useState(false)
  const [provinceCountsError, setProvinceCountsError] = useState(false)
  const hasLoadedRef = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)

  useSEO({
    title: listing ? `${listing.title} | Materiales para el hogar` : 'Materiales para construcción y reparación | Cubitat',
    description: listing?.description || 'Explora materiales para construir, reparar y mejorar tu vivienda en Cuba.',
  })

  useEffect(() => {
    function syncPath() {
      const nextSlug = getSlugFromPath()
      if (nextSlug) {
        setLoading(true)
        setLoadError(false)
        setListing(null)
      }
      setSlug(nextSlug)
    }
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    setListing(null)
    if (!slug) {
      void fetchMaterialListings({ category: category || undefined, province: province || undefined, availability: availability || undefined, search, offset: (currentPage - 1) * CATALOG_PAGE_SIZE, pageSize: CATALOG_PAGE_SIZE })
        .then(({ items, total: resultCount }) => { if (active) { setListings(items); setTotal(resultCount) } })
        .catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) { hasLoadedRef.current = true; setLoading(false) } })
    } else {
      void fetchMaterialListing(slug)
        .then((item) => { if (active) setListing(item) })
        .catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) { hasLoadedRef.current = true; setLoading(false) } })
    }
    return () => { active = false }
  }, [slug, category, province, availability, search, currentPage, reloadKey])

  useEffect(() => {
    if (!listing || !focusDetailTarget) return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('material-inquiry')
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        target.focus()
      }
      setFocusDetailTarget(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [listing, focusDetailTarget])

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

  function openListing(item: MaterialListing, target: 'inquiry' | null = null) {
    setLoading(true)
    setLoadError(false)
    setListing(null)
    window.history.pushState(null, '', `/materiales/${encodeURIComponent(item.slug)}`)
    setFocusDetailTarget(target)
    setSlug(item.slug)
    setSubmitState('idle')
    window.scrollTo({ top: 0 })
  }

  function backToCatalog() {
    window.history.pushState(null, '', '/materiales')
    setFocusDetailTarget(null)
    setSlug(null)
    setSubmitState('idle')
    window.scrollTo({ top: 0 })
  }

  function handlePageChange(page: number) {
    setCurrentPage(page)
    const marker = document.getElementById('catalog-pagination-start')
    if (marker && typeof marker.scrollIntoView === 'function') {
      marker.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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

  if (slug) {
    if (loading) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center" aria-label="Cargando anuncio" aria-busy="true"><div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-emerald-100" /><p role="status" className="mt-4 text-neutral-600">Cargando anuncio…</p></main>
    if (loadError) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center" role="alert"><h1 className="text-2xl font-bold">No se pudo cargar el anuncio</h1><p className="mt-2 text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button><Button className="mt-5 ml-2" variant="outline" onClick={backToCatalog}>Volver al catálogo</Button></main>
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
              <div id="marketplace-contact" className="mt-6"><MarketplaceContactActions listingType="material" listingId={listing.id} listingTitle={listing.title} listingLocation={listing.province} onMissing={() => openListing(listing, 'inquiry')} /></div>
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

  if (loading && !hasLoadedRef.current) return <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-12" aria-label="Cargando materiales"><div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-neutral-200" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 rounded-2xl bg-neutral-200" />)}</div></div></main>
  if (loadError && !hasLoadedRef.current) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">No se pudo cargar el catálogo</h1><p className="mt-2 text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button></main>

  const resultsContent = loadError ? (
    <section role="alert" className="rounded-2xl border border-amber-200 bg-white px-5 py-10 text-center">
      <h2 className="text-lg font-bold">No se pudieron actualizar los resultados</h2>
      <p className="mt-2 text-sm text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p>
      <Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>
    </section>
  ) : listings.length === 0 ? (
    <section className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-14 text-center">
      <h2 className="text-lg font-bold">No encontramos materiales con esos filtros</h2>
      <p className="mt-2 text-sm text-neutral-600">Prueba otra palabra, categoría o provincia.</p>
    </section>
  ) : (
    <section className={`grid gap-5 ${mapOpen ? 'sm:grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'}`} aria-label="Materiales disponibles">
      {listings.map((item, index) => <article key={item.id} className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><button type="button" onClick={() => openListing(item)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><div className="relative h-48 bg-amber-50"><MarketplaceCardImage src={item.photoUrls[0]} storageBucket={item.photoUrls[0] && isMaterialPhotoPath(item.photoUrls[0]) ? MATERIAL_PHOTO_BUCKET : undefined} alt="" eager={index < 2} className="h-full w-full object-cover" fallback={<div className="flex h-full items-center justify-center text-amber-800"><Boxes size={36} /><span className="sr-only">Foto no disponible</span></div>} failureFallback={<div role="status" className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-amber-900"><Boxes size={36} />Foto no disponible temporalmente</div>} />{item.photoUnavailable && <span role="status" className="absolute inset-x-2 bottom-2 rounded-lg bg-white/95 px-2 py-1 text-center text-xs text-amber-900">Fotos no disponibles temporalmente</span>}</div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{MATERIAL_CATEGORY_LABELS[item.category]}</p><h2 className="mt-1 text-lg font-bold text-neutral-900">{item.title}</h2><p className="mt-2 flex items-center gap-1 text-sm text-neutral-600"><MapPin size={15} />{item.province}</p><p className="mt-3 text-lg font-extrabold text-emerald-800">{formatPrice(item)}</p><p className="mt-1 text-xs text-neutral-500">{availabilityLabel(item.availability)}</p><span className="mt-4 inline-flex min-h-10 items-center font-bold text-emerald-800">Ver anuncio →</span></div></button><MarketplaceCardActions listingType="material" listingId={item.id} listingTitle={item.title} listingLocation={item.province} onMissing={() => openListing(item, 'inquiry')} />{PHASE_FOUR_MAT_ENABLED && <SaveMarketplaceListingButton listingType="material" listingId={item.id} listingTitle={item.title} />}</article>)}
    </section>
  )
  const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE)

  return (
    <main className="marketplace-directory-map-page min-h-[75vh] bg-neutral-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className={`mx-auto ${mapOpen ? 'max-w-screen-2xl' : 'max-w-6xl'}`}>
        {import.meta.env.MODE === 'phase34-dev' && <span className="marketplace-directory-dev-badge">Entorno de pruebas · DEV</span>}
        <header className="marketplace-directory-heading">
          <h1 className="font-black text-neutral-900">Materiales de construcción</h1>
          <div className="marketplace-directory-heading__actions"><Button type="button" className="min-h-11" onClick={onCreateListing}>Vender materiales</Button><Button type="button" variant="outline" className="min-h-11" onClick={onManageListings}>Mis anuncios</Button></div>
        </header>
        <div id="catalog-pagination-start" style={{ height: '1px', marginBottom: '-1px' }} />
        <CatalogExplorerLayout className="marketplace-directory-layout" catalogClassName="marketplace-directory-catalog" mapClassName="marketplace-directory-map" mapOpen={mapOpen} mapId="materials-province-map" mapBusy={provinceCountsLoading} toolbar={
          <CatalogFilterToolbar label="Filtros de materiales" resultLabel="anuncios" resultCount={total} activeFiltersCount={[category, province, availability, search].filter(Boolean).length} onClearFilters={() => { setCategory(''); setProvince(''); setAvailability(''); setSearch(''); setCurrentPage(1) }}
            search={<label><span className="sr-only">Buscar material</span><input aria-label="Buscar material" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} className="marketplace-filter-search" placeholder="Cemento, tubería…" /></label>}
            filters={<>
              <label><span className="sr-only">Categoría</span><select aria-label="Categoría" value={category} onChange={(event) => { setCategory(event.target.value as MaterialCategory | ''); setCurrentPage(1) }}><option value="">Todas las categorías</option>{MATERIAL_CATEGORIES.map((value) => <option key={value} value={value}>{MATERIAL_CATEGORY_LABELS[value]}</option>)}</select></label>
              <label><span className="sr-only">Provincia</span><select aria-label="Provincia" value={province} onChange={(event) => { setProvince(event.target.value); setCurrentPage(1) }}><option value="">Toda Cuba</option>{cubanProvinces.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label><span className="sr-only">Disponibilidad</span><select aria-label="Disponibilidad" value={availability} onChange={(event) => { setAvailability(event.target.value as Exclude<MaterialListing['availability'], 'out_of_stock'> | ''); setCurrentPage(1) }}><option value="">Todas</option><option value="available">Disponible</option><option value="limited">Disponibilidad limitada</option><option value="made_to_order">Por encargo</option></select></label>
            </>}
          />
        } map={
          provinceCountsError
            ? <ProvinceMapStatus error onClose={() => setMapOpen(false)} resultLabel="anuncios de materiales" />
            : <CatalogMap mode="province-counts" counts={provinceCounts} selectedProvince={province} onClose={() => setMapOpen(false)} onSelectProvince={(nextProvince) => { setProvince((current) => current === nextProvince ? '' : nextProvince); setCurrentPage(1) }} accent="#b45309" resultLabel="anuncios de materiales" />
        }>

          <div className="marketplace-directory-results" aria-busy={loading}>
            <p className="mb-4 text-sm text-neutral-600">{total} {total === 1 ? 'anuncio disponible' : 'anuncios disponibles'}</p>
            {loading && <span role="status" aria-label="Actualizando materiales" className="sr-only">Actualizando resultados…</span>}
            {resultsContent}
            <CatalogPagination currentPage={currentPage} totalPages={totalPages} disabled={loading} onPageChange={handlePageChange} />
          </div>
        </CatalogExplorerLayout>
        <MarketplaceMapToggle mapId="materials-province-map" open={mapOpen} className={mapOpen ? 'is-map-open' : ''} onToggle={() => setMapOpen((open) => !open)} />
      </div>
    </main>
  )
}
