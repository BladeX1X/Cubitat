import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Boxes, CalendarDays, MapPin } from 'lucide-react'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MarketplaceContactActions } from '../../shared/ui/MarketplaceContactActions'
import { MarketplaceCardImage } from '../../shared/ui/MarketplaceCardImage'
import { CatalogCardGallery } from '../../shared/ui/CatalogCardGallery'
import { MarketplaceListingDetail } from '../../shared/ui/MarketplaceListingDetail'
import { SaveMarketplaceListingButton } from '../../shared/ui/SaveMarketplaceListingButton'
import { CatalogCardFrame } from '../../shared/ui/CatalogCardFrame'
import { MarketplaceCardActions } from '../../shared/ui/MarketplaceCardActions'
import { MarketplaceDetailMap } from '../../modules/marketplace/MarketplaceDetailMap'
import { getCubanProvinceMapCenter } from '../../modules/maps/data/cubanProvinceMapCenters'
import { MarketplaceReportPanel } from '../../shared/ui/MarketplaceReportPanel'
import { FeaturedHomeServicesSection } from '../../shared/ui/FeaturedHomeServicesSection'
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
import { cubanProvinces } from '../../shared/data/cubaLocations'
import '../marketplace/MarketplaceDirectoryMap.css'

type MaterialsMarketplacePageProps = {
  onRequireLogin: () => void
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

export function MaterialsMarketplacePage({ onRequireLogin }: MaterialsMarketplacePageProps) {
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
      <MarketplaceListingDetail
        backLabel="Volver al catálogo"
        breadcrumb="Materiales"
        category={MATERIAL_CATEGORY_LABELS[listing.category]}
        title={listing.title}
        location={listing.province}
        price={formatPrice(listing)}
        summary={availabilityLabel(listing.availability)}
        images={listing.photoUrls}
        imageLabel={`Fotos de ${listing.title}`}
        imageUnavailable={listing.photoUnavailable}
        imageFallback={<div className="marketplace-detail-image-fallback"><Boxes size={54} /><span>{listing.photoUnavailable ? 'Fotos no disponibles temporalmente' : 'Fotos del material'}</span></div>}
        renderImage={(src, index, eager) => <MarketplaceCardImage src={src} alt={`${listing.title}, foto ${index + 1}`} eager={eager} className="property-photo-slide" fallback={<div className="marketplace-detail-image-fallback"><Boxes size={54} /><span>Foto no disponible</span></div>} />}
        favoriteAction={PHASE_FOUR_MAT_ENABLED && <SaveMarketplaceListingButton listingType="material" listingId={listing.id} listingTitle={listing.title} className="marketplace-detail-favorite" showLabel iconSize={19} />}
        mapLabel={`Ubicación declarada: ${listing.province}`}
        mapDescription={listing.coordinates ? 'El punto es aproximado. El círculo representa un área de 1 km de diámetro y no revela la dirección exacta.' : 'El mapa muestra una referencia provincial. El anunciante no publicó una dirección exacta.'}
        mapContent={<MarketplaceDetailMap center={listing.coordinates ? [listing.coordinates.longitude, listing.coordinates.latitude] : getCubanProvinceMapCenter(listing.province)} locationLabel={listing.province} />}
        contactActions={<div id="marketplace-contact"><MarketplaceContactActions listingType="material" listingId={listing.id} listingTitle={listing.title} listingLocation={listing.province} onMissing={() => openListing(listing, 'inquiry')} /></div>}
        contactPanel={(
          <>
            <h2>Contactar al vendedor</h2>
            <p className="marketplace-contact-meta"><CalendarDays size={12} aria-hidden="true" /> Actualizado {formatDate(listing.updatedAt)}</p>
            <form className="marketplace-inquiry-form" onSubmit={submitInquiry}>
              <label htmlFor="material-inquiry" className="marketplace-inquiry-label">Tu mensaje</label>
              <textarea id="material-inquiry" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={3000} required rows={4} disabled={submitState === 'sending'} className="marketplace-inquiry-textarea" placeholder="Pregunta por medidas, precio o disponibilidad…" />
              <Button type="submit" disabled={submitState === 'sending'} className="marketplace-inquiry-submit">{submitState === 'sending' ? 'Enviando…' : 'Enviar consulta'}</Button>
              {submitState === 'sent' && <p role="status" className="mt-3 text-sm text-emerald-800">Consulta enviada. No crea una orden ni reserva.</p>}
              {submitState === 'error' && <p role="alert" className="mt-3 text-sm text-red-700">No se pudo enviar. Inicia sesión y vuelve a intentarlo.</p>}
            </form>
          </>
        )}
        onBack={backToCatalog}
        footer={<FeaturedHomeServicesSection />}
      >
        <section className="marketplace-detail-panel">
          <h2>Información del material</h2>
          <div className="marketplace-detail-facts">
            <div className="marketplace-detail-fact"><strong>{MATERIAL_CATEGORY_LABELS[listing.category]}</strong><span>Categoría</span></div>
            <div className="marketplace-detail-fact"><strong>{availabilityLabel(listing.availability)}</strong><span>Disponibilidad</span></div>
            <div className="marketplace-detail-fact"><strong>{listing.province}</strong><span>Ubicación</span></div>
            <div className="marketplace-detail-fact"><strong>{new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(listing.updatedAt))}</strong><span>Actualizado</span></div>
          </div>
        </section>
        <section className="marketplace-detail-panel">
          <h2>Descripción del material</h2>
          <p>{listing.description}</p>
        </section>
        <section className="marketplace-detail-panel">
          <h2>Antes de comprar</h2>
          <p>Precio y disponibilidad son declarados por el vendedor. Confírmalos antes de trasladarte; este anuncio no constituye reserva ni garantía de inventario.</p>
        </section>
        <MarketplaceReportPanel listingType="material" listingId={listing.id} listingTitle={listing.title} />
      </MarketplaceListingDetail>
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
    <section className="catalog-card-grid" aria-label="Materiales disponibles">
      {listings.map((item, index) => (
        <CatalogCardFrame key={item.id} className="marketplace-listing-card">
          <CatalogCardGallery
            images={item.photoUrls}
            label={item.title}
            eager={index < 2}
            fallback={<div className="flex h-full items-center justify-center bg-amber-50 text-amber-800"><Boxes size={36} /><span className="sr-only">Foto no disponible</span></div>}
            renderImage={(src, _imageIndex, eager) => <MarketplaceCardImage src={src} alt="" eager={eager} className="property-photo-slide" fallback={<div className="flex h-full items-center justify-center bg-amber-50 text-amber-800"><Boxes size={36} /><span className="sr-only">Foto no disponible</span></div>} />}
            status={item.photoUnavailable && <span role="status" className="absolute inset-x-2 bottom-8 z-10 rounded-lg bg-white/95 px-2 py-1 text-center text-xs text-amber-900">Fotos no disponibles temporalmente</span>}
            overlay={PHASE_FOUR_MAT_ENABLED && <SaveMarketplaceListingButton listingType="material" listingId={item.id} listingTitle={item.title} />}
          />
          <button type="button" onClick={() => openListing(item)} className="catalog-card__open focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            <div className="catalog-card__content">
              <p className="catalog-card__category">{MATERIAL_CATEGORY_LABELS[item.category]}</p>
              <h2 className="catalog-card__title">{item.title}</h2>
              <p className="catalog-card__location"><MapPin size={15} />{item.province}</p>
              <p className="catalog-card__price mt-3">{formatPrice(item)}</p>
              <p className="mt-1 text-xs text-neutral-500">{availabilityLabel(item.availability)}</p>
              <span className="catalog-card__more">Ver anuncio →</span>
            </div>
          </button>
          <MarketplaceCardActions listingType="material" listingId={item.id} listingTitle={item.title} listingLocation={item.province} onMissing={() => openListing(item, 'inquiry')} />
        </CatalogCardFrame>
      ))}
    </section>
  )
  const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE)

  return (
    <main className="marketplace-directory-map-page min-h-[75vh] bg-neutral-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className={`mx-auto ${mapOpen ? 'max-w-screen-2xl' : 'max-w-6xl'}`}>
        {import.meta.env.MODE === 'phase34-dev' && <span className="marketplace-directory-dev-badge">Entorno de pruebas · DEV</span>}
        <header className="marketplace-directory-heading">
          <h1 className="font-black text-neutral-900">Materiales de construcción</h1>
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
