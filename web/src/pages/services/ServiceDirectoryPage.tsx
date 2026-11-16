import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, BriefcaseBusiness, MapPin } from 'lucide-react'
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
import { HOME_SERVICE_CATEGORIES, HOME_SERVICE_CATEGORY_LABELS, type HomeServiceCategory, type HomeServiceProvider } from '../../modules/home-services/types'
import { fetchHomeServiceProvider, fetchHomeServiceProviders, fetchHomeServiceProvinceCounts, sendHomeServiceInquiry } from '../../modules/home-services/homeServiceRepository'
import type { ProvinceCount } from '../../modules/marketplace/provinceAggregates'
import { ProvinceMapStatus } from '../../modules/marketplace/ProvinceMapStatus'
import { cubanMunicipalities, cubanProvinces } from '../../shared/data/cubaLocations'
import { PHASE_FOUR_SVC_ENABLED } from '../../shared/config/features'
import '../marketplace/MarketplaceDirectoryMap.css'

type ServiceDirectoryPageProps = {
  onRequireLogin: () => void
  onCreateProfile: () => void
  onManageProfiles: () => void
  reviewsEnabled: boolean
  userId: string | null
}

const ServiceReviewsPanel = import.meta.env.VITE_PHASE4_REV_ENABLED === 'true'
  || (import.meta.env.DEV && import.meta.env.VITE_PHASE4_UI_ENABLED === 'true')
  ? lazy(() => import('../../modules/service-reviews/ServiceReviewsPanel').then((module) => ({ default: module.ServiceReviewsPanel })))
  : null

function getSlugFromPath(): string | null {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts.length <= 1 || parts[0] !== 'servicios') return null
  try { return decodeURIComponent(parts[1]) } catch { return null }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

export function ServiceDirectoryPage({ onRequireLogin, onCreateProfile, onManageProfiles, reviewsEnabled, userId }: ServiceDirectoryPageProps) {
  const [slug, setSlug] = useState<string | null>(getSlugFromPath)
  const [category, setCategory] = useState<HomeServiceCategory | ''>('')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [providers, setProviders] = useState<HomeServiceProvider[]>([])
  const [provider, setProvider] = useState<HomeServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [message, setMessage] = useState('')
  const [inquiryState, setInquiryState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [focusDetailTarget, setFocusDetailTarget] = useState<'inquiry' | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [provinceCounts, setProvinceCounts] = useState<ProvinceCount[]>([])
  const [provinceCountsLoading, setProvinceCountsLoading] = useState(false)
  const [provinceCountsError, setProvinceCountsError] = useState(false)
  const hasLoadedRef = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)

  useSEO({
    title: provider ? `${provider.displayName} | Servicios para el hogar` : 'Profesionales del hogar | Cubitat',
    description: provider?.description || 'Encuentra profesionales para reparar, mejorar y cuidar tu hogar en Cuba.',
  })

  useEffect(() => {
    function syncPath() {
      const nextSlug = getSlugFromPath()
      if (nextSlug) {
        setLoading(true)
        setLoadError(false)
        setProvider(null)
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
    setProvider(null)
    if (!slug) {
      void fetchHomeServiceProviders({ category: category || undefined, province: province || undefined, municipality: municipality || undefined, search, offset: (currentPage - 1) * CATALOG_PAGE_SIZE, pageSize: CATALOG_PAGE_SIZE })
        .then(({ items, total: resultCount }) => { if (active) { setProviders(items); setTotal(resultCount) } })
        .catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) { hasLoadedRef.current = true; setLoading(false) } })
    } else {
      void fetchHomeServiceProvider(slug).then((item) => {
        if (!active) return
        setProvider(item)
      }).catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) { hasLoadedRef.current = true; setLoading(false) } })
    }
    return () => { active = false }
  }, [slug, category, province, municipality, search, currentPage, reloadKey])

  useEffect(() => {
    if (!provider || !focusDetailTarget) return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('service-inquiry')
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        target.focus()
      }
      setFocusDetailTarget(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [provider, focusDetailTarget])

  useEffect(() => {
    if (slug || !mapOpen) return
    let active = true
    setProvinceCountsLoading(true)
    setProvinceCountsError(false)
    void fetchHomeServiceProvinceCounts({ category: category || undefined, municipality: municipality || undefined, search })
      .then((counts) => { if (active) setProvinceCounts(counts) })
      .catch(() => { if (active) setProvinceCountsError(true) })
      .finally(() => { if (active) setProvinceCountsLoading(false) })
    return () => { active = false }
  }, [slug, mapOpen, category, municipality, search])

  function openProvider(item: HomeServiceProvider, target: 'inquiry' | null = null) {
    setLoading(true)
    setLoadError(false)
    setProvider(null)
    window.history.pushState(null, '', `/servicios/${encodeURIComponent(item.slug)}`)
    setFocusDetailTarget(target)
    setSlug(item.slug)
    setInquiryState('idle')
    window.scrollTo({ top: 0 })
  }

  function backToDirectory() {
    window.history.pushState(null, '', '/servicios')
    setFocusDetailTarget(null)
    setSlug(null)
    setInquiryState('idle')
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
    if (!provider) return
    const trimmed = message.trim()
    if (trimmed.length < 10 || trimmed.length > 3000) return
    setInquiryState('sending')
    try {
      await sendHomeServiceInquiry(provider.id, trimmed)
      setMessage('')
      setInquiryState('sent')
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') onRequireLogin()
      setInquiryState('error')
    }
  }

  if (slug) {
    if (loading) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center" aria-label="Cargando ficha de servicio" aria-busy="true"><div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-emerald-100" /><p role="status" className="mt-4 text-neutral-600">Cargando perfil…</p></main>
    if (loadError) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center" role="alert"><h1 className="text-2xl font-bold">No se pudo cargar el perfil</h1><p className="mt-2 text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button><Button className="mt-5 ml-2" variant="outline" onClick={backToDirectory}>Volver al directorio</Button></main>
    if (!provider) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Servicio no disponible</h1><p className="mt-2 text-neutral-600">Este perfil no existe o todavía no está publicado.</p><Button className="mt-5" onClick={backToDirectory}>Volver al directorio</Button></main>
    return (
      <main className="min-h-[75vh] bg-neutral-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <button type="button" onClick={backToDirectory} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white hover:text-neutral-900"><ArrowLeft size={18} />Volver al directorio</button>
          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            {provider.galleryUrls.length > 0 && <div className="grid max-h-[420px] grid-cols-1 gap-1 overflow-hidden sm:grid-cols-2">{provider.galleryUrls.slice(0, 3).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${provider.displayName}, trabajo ${index + 1}`} loading="lazy" className={`h-56 w-full object-cover sm:h-72 ${index > 0 ? 'hidden sm:block' : ''}`} />)}</div>}
            <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1fr_320px]">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">{HOME_SERVICE_CATEGORY_LABELS[provider.category]}</p>
                <h1 className="mt-2 text-3xl font-black text-neutral-900">{provider.displayName}</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600"><MapPin size={16} />{provider.province}{provider.municipalities.length ? ` · ${provider.municipalities.join(', ')}` : ''}</p>
                <p className="mt-6 whitespace-pre-line leading-7 text-neutral-700">{provider.description}</p>
                <p className="mt-4 text-xs text-neutral-500">Actualizado {formatDate(provider.updatedAt)} · Perfil comercial; Cubitat no certifica licencias ni garantiza el servicio.</p>
              </div>
              <aside className="rounded-2xl bg-emerald-50 p-5">
                <h2 className="text-lg font-bold text-neutral-900">Contactar</h2>
                <div id="marketplace-contact"><MarketplaceContactActions listingType="service" listingId={provider.id} listingTitle={provider.displayName} listingLocation={[...provider.municipalities, provider.province].filter(Boolean).join(', ')} onMissing={() => openProvider(provider, 'inquiry')} /></div>
                <form className="mt-4 space-y-3" onSubmit={submitInquiry}>
                  <label className="block text-sm font-semibold text-neutral-800" htmlFor="service-inquiry">Mensaje para el profesional</label>
                  <textarea id="service-inquiry" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={3000} required rows={4} className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm" placeholder="Cuéntale qué trabajo necesitas…" />
                  <Button className="w-full" type="submit" disabled={inquiryState === 'sending'}>{inquiryState === 'sending' ? 'Enviando…' : 'Enviar consulta'}</Button>
                  {inquiryState === 'sent' && <p role="status" className="text-sm text-emerald-800">Consulta enviada. No crea una contratación ni reserva.</p>}
                  {inquiryState === 'error' && <p role="alert" className="text-sm text-red-700">No se pudo enviar. Inicia sesión y vuelve a intentarlo.</p>}
                </form>
              </aside>
            </div>
          </section>
          {reviewsEnabled && ServiceReviewsPanel && <Suspense fallback={<p className="mt-6 text-sm text-neutral-500">Cargando reseñas…</p>}><ServiceReviewsPanel providerId={provider.id} userId={userId} onRequireLogin={onRequireLogin} /></Suspense>}
        </div>
      </main>
    )
  }

  if (loading && !hasLoadedRef.current) return <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-12" aria-label="Cargando servicios"><div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-neutral-200" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 rounded-2xl bg-neutral-200" />)}</div></div></main>
  if (loadError && !hasLoadedRef.current) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">No se pudo cargar el directorio</h1><p className="mt-2 text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button></main>

  const resultsContent = loadError ? (
    <section role="alert" className="rounded-2xl border border-amber-200 bg-white px-5 py-10 text-center">
      <h2 className="text-lg font-bold">No se pudieron actualizar los resultados</h2>
      <p className="mt-2 text-sm text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p>
      <Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>
    </section>
  ) : providers.length === 0 ? (
    <section className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-14 text-center">
      <h2 className="text-lg font-bold">No encontramos profesionales con esos filtros</h2>
      <p className="mt-2 text-sm text-neutral-600">Prueba otra palabra, categoría, provincia o municipio.</p>
    </section>
  ) : (
    <section className={`grid gap-5 ${mapOpen ? 'sm:grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'}`} aria-label="Profesionales disponibles">
      {providers.map((item, index) => <article key={item.id} className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><button type="button" onClick={() => openProvider(item)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><div className="h-48 bg-emerald-50"><MarketplaceCardImage src={item.galleryUrls[0]} alt="" eager={index < 2} className="h-full w-full object-cover" fallback={<div role="status" className="flex h-full items-center justify-center text-emerald-800"><BriefcaseBusiness size={36} /><span className="sr-only">Foto no disponible</span></div>} /></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{HOME_SERVICE_CATEGORY_LABELS[item.category]}</p><h2 className="mt-1 text-lg font-bold text-neutral-900">{item.displayName}</h2><p className="mt-2 flex items-center gap-1 text-sm text-neutral-600"><MapPin size={15} />{item.municipalities.length ? `${item.municipalities.join(', ')} · ` : ''}{item.province}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{item.description}</p><span className="mt-4 inline-flex min-h-10 items-center font-bold text-emerald-800">Ver perfil →</span></div></button><MarketplaceCardActions listingType="service" listingId={item.id} listingTitle={item.displayName} listingLocation={[...item.municipalities, item.province].filter(Boolean).join(', ')} onMissing={() => openProvider(item, 'inquiry')} />{PHASE_FOUR_SVC_ENABLED && <SaveMarketplaceListingButton listingType="service" listingId={item.id} listingTitle={item.displayName} />}</article>)}
    </section>
  )
  const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE)

  return (
    <main className="marketplace-directory-map-page min-h-[75vh] bg-neutral-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className={`mx-auto ${mapOpen ? 'max-w-screen-2xl' : 'max-w-6xl'}`}>
        {import.meta.env.MODE === 'phase34-dev' && <span className="marketplace-directory-dev-badge">Entorno de pruebas · DEV</span>}
        <header className="marketplace-directory-heading">
          <h1 className="font-black text-neutral-900">Servicios para el hogar</h1>
          <div className="marketplace-directory-heading__actions"><Button type="button" className="min-h-11" onClick={onCreateProfile}>Publicar mi servicio</Button><Button type="button" variant="outline" className="min-h-11" onClick={onManageProfiles}>Mis perfiles</Button></div>
        </header>
        <div id="catalog-pagination-start" style={{ height: '1px', marginBottom: '-1px' }} />
        <CatalogExplorerLayout className="marketplace-directory-layout" catalogClassName="marketplace-directory-catalog" mapClassName="marketplace-directory-map" mapOpen={mapOpen} mapId="service-province-map" mapBusy={provinceCountsLoading} toolbar={
          <CatalogFilterToolbar label="Filtros de profesionales" resultLabel="profesionales" resultCount={total} activeFiltersCount={[category, province, municipality, search].filter(Boolean).length} onClearFilters={() => { setCategory(''); setProvince(''); setMunicipality(''); setSearch(''); setCurrentPage(1) }}
            search={<label><span className="sr-only">Buscar servicio</span><input aria-label="Buscar servicio" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} className="marketplace-filter-search" placeholder="Plomería, electricidad…" /></label>}
            filters={<>
              <label><span className="sr-only">Categoría</span><select aria-label="Categoría" value={category} onChange={(event) => { setCategory(event.target.value as HomeServiceCategory | ''); setCurrentPage(1) }}><option value="">Todas las categorías</option>{HOME_SERVICE_CATEGORIES.map((value) => <option key={value} value={value}>{HOME_SERVICE_CATEGORY_LABELS[value]}</option>)}</select></label>
              <label><span className="sr-only">Provincia</span><select aria-label="Provincia" value={province} onChange={(event) => { setProvince(event.target.value); setMunicipality(''); setCurrentPage(1) }}><option value="">Toda Cuba</option>{cubanProvinces.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label><span className="sr-only">Municipio</span><select aria-label="Municipio" value={municipality} onChange={(event) => { setMunicipality(event.target.value); setCurrentPage(1) }} disabled={!province}><option value="">Todos los municipios</option>{(province ? cubanMunicipalities[province] ?? [] : []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>}
          />
        } map={
          provinceCountsError
            ? <ProvinceMapStatus error onClose={() => setMapOpen(false)} resultLabel="profesionales" />
            : <CatalogMap mode="province-counts" counts={provinceCounts} selectedProvince={province} onClose={() => setMapOpen(false)} onSelectProvince={(nextProvince) => { setProvince((current) => current === nextProvince ? '' : nextProvince); setMunicipality(''); setCurrentPage(1) }} resultLabel="profesionales" />
        }>

          <div className="marketplace-directory-results" aria-busy={loading}>
            <p className="mb-4 text-sm text-neutral-600">{total} {total === 1 ? 'profesional disponible' : 'profesionales disponibles'}</p>
            {loading && <span role="status" aria-label="Actualizando profesionales" className="sr-only">Actualizando resultados…</span>}
            {resultsContent}
            <CatalogPagination currentPage={currentPage} totalPages={totalPages} disabled={loading} onPageChange={handlePageChange} />
          </div>
        </CatalogExplorerLayout>
        <MarketplaceMapToggle mapId="service-province-map" open={mapOpen} className={mapOpen ? 'is-map-open' : ''} onToggle={() => setMapOpen((open) => !open)} />
      </div>
    </main>
  )
}
