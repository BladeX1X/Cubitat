import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, BriefcaseBusiness, MapPin, Search } from 'lucide-react'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MarketplaceContactActions } from '../../shared/ui/MarketplaceContactActions'
import { HOME_SERVICE_CATEGORIES, HOME_SERVICE_CATEGORY_LABELS, type HomeServiceCategory, type HomeServiceProvider } from '../../modules/home-services/types'
import { fetchHomeServiceProvider, fetchHomeServiceProviders, sendHomeServiceInquiry } from '../../modules/home-services/homeServiceRepository'

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
  const [providers, setProviders] = useState<HomeServiceProvider[]>([])
  const [provider, setProvider] = useState<HomeServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [message, setMessage] = useState('')
  const [inquiryState, setInquiryState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useSEO({
    title: provider ? `${provider.displayName} | Servicios para el hogar` : 'Profesionales del hogar | Cubitat',
    description: provider?.description || 'Encuentra profesionales para reparar, mejorar y cuidar tu hogar en Cuba.',
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
    setProvider(null)
    if (!slug) {
      void fetchHomeServiceProviders({ category: category || undefined, province: province.trim() || undefined })
        .then((items) => { if (active) setProviders(items) })
        .catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) setLoading(false) })
    } else {
      void fetchHomeServiceProvider(slug).then((item) => {
        if (!active) return
        setProvider(item)
      }).catch(() => { if (active) setLoadError(true) })
        .finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false }
  }, [slug, category, province])

  function openProvider(item: HomeServiceProvider) {
    window.history.pushState(null, '', `/servicios/${encodeURIComponent(item.slug)}`)
    setSlug(item.slug)
    setInquiryState('idle')
    window.scrollTo({ top: 0 })
  }

  function backToDirectory() {
    window.history.pushState(null, '', '/servicios')
    setSlug(null)
    setInquiryState('idle')
    window.scrollTo({ top: 0 })
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

  if (loading) return <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-12" aria-label="Cargando servicios"><div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-neutral-200" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 rounded-2xl bg-neutral-200" />)}</div></div></main>
  if (loadError) return <main className="mx-auto min-h-[55vh] max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">No se pudo cargar el directorio</h1><p className="mt-2 text-neutral-600">Comprueba la conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => window.location.reload()}>Reintentar</Button></main>

  if (slug) {
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
                <MarketplaceContactActions listingType="service" listingId={provider.id} label="Ver teléfono o WhatsApp" />
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

  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><BriefcaseBusiness size={17} />Servicios para el hogar</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-900 sm:text-4xl">Encuentra profesionales para tu hogar</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">Explora servicios por categoría y zona. Los perfiles son anuncios moderados, no una certificación profesional.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button type="button" className="min-h-11" onClick={onCreateProfile}>Publicar mi servicio</Button><Button type="button" variant="outline" className="min-h-11" onClick={onManageProfiles}>Mis perfiles</Button></div>
        <section aria-label="Filtros de profesionales" className="mt-7 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-semibold">Categoría<select value={category} onChange={(event) => setCategory(event.target.value as HomeServiceCategory | '')} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3"><option value="">Todas las categorías</option>{HOME_SERVICE_CATEGORIES.map((value) => <option key={value} value={value}>{HOME_SERVICE_CATEGORY_LABELS[value]}</option>)}</select></label>
          <label className="text-sm font-semibold">Provincia<input value={province} onChange={(event) => setProvince(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Ej. La Habana" /></label>
          <Button type="button" className="min-h-11" onClick={() => { setCategory(''); setProvince('') }}><Search size={16} className="mr-2" />Limpiar</Button>
        </section>
        {providers.length === 0 ? <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-14 text-center"><h2 className="text-lg font-bold">Todavía no hay perfiles en esta zona</h2><p className="mt-2 text-sm text-neutral-600">Prueba otra categoría o provincia. Los nuevos perfiles aparecerán después de su revisión.</p></section> : <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Profesionales disponibles">{providers.map((item) => <button key={item.id} type="button" onClick={() => openProvider(item)} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="h-48 bg-emerald-50">{item.galleryUrls[0] ? <img src={item.galleryUrls[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-emerald-800"><BriefcaseBusiness size={36} /></div>}</div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{HOME_SERVICE_CATEGORY_LABELS[item.category]}</p><h2 className="mt-1 text-lg font-bold text-neutral-900">{item.displayName}</h2><p className="mt-2 flex items-center gap-1 text-sm text-neutral-600"><MapPin size={15} />{item.province}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{item.description}</p><span className="mt-4 inline-flex min-h-10 items-center font-bold text-emerald-800">Ver perfil →</span></div></button>)}</section>}
      </div>
    </main>
  )
}
