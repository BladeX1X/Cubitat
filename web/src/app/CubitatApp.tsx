import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Building2, Heart, Home, UserRound } from 'lucide-react'
import { useAuthModal } from '../modules/auth/contexts/AuthModalContext'
import { filterProperties } from '../modules/properties/services/filterProperties'
import type { Property } from '../modules/properties/types'
import { normalizePropertyImages, optimizePropertyCardImage } from '../modules/properties/utils/images'
import type { LocationSuggestion, SearchFilters } from '../modules/search/types'
import { HomePage, PopularLocations } from '../pages/home/HomePage'
import { Button } from '../shared/ui/button'
import { supabase } from '../shared/lib/supabaseClient'
import { initAnalytics, trackPageView } from '../shared/lib/analytics'
import { Header } from '../components/layout/Header'
import { SiteFooter } from '../components/layout/SiteFooter'
import { PWAInstallPrompt } from '../components/layout/PWAInstallPrompt'

const LoginModal = lazy(() =>
  import('../modules/auth/components/LoginModal').then((module) => ({ default: module.LoginModal })),
)
const SavePromptModal = lazy(() =>
  import('../modules/auth/components/SavePromptModal').then((module) => ({ default: module.SavePromptModal })),
)
const ResultsPage = lazy(() =>
  import('../pages/results/ResultsPage').then((module) => ({ default: module.ResultsPage })),
)
const DetailPage = lazy(() =>
  import('../pages/detail/DetailPage').then((module) => ({ default: module.DetailPage })),
)
const PublishPage = lazy(() =>
  import('../pages/publish/PublishPage').then((module) => ({ default: module.PublishPage })),
)
const MyPropertiesPage = lazy(() =>
  import('../pages/my-properties/MyPropertiesPage').then((module) => ({ default: module.MyPropertiesPage })),
)
const AccountPage = lazy(() =>
  import('../pages/account/AccountPage').then((module) => ({ default: module.AccountPage })),
)
const FavoritesPage = lazy(() =>
  import('../pages/favorites/FavoritesPage').then((module) => ({ default: module.FavoritesPage })),
)
const AuthCallbackPage = lazy(() =>
  import('../pages/auth/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })),
)
const ResetPasswordPage = lazy(() =>
  import('../pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
)
const AdminPage = lazy(() =>
  import('../pages/moderar/AdminPage').then((module) => ({ default: module.AdminPage })),
)

const initialFilters: SearchFilters = {
  query: '',
  operations: [], // Empty array means all/no specific filter
  propertyType: 'all',
  zoneId: 'all',
}

function getInitialFilters(): SearchFilters {
  if (typeof window === 'undefined') {
    return initialFilters
  }
  const params = new URLSearchParams(window.location.search)
  const opsStr = params.get('operacion')
  const operations = opsStr ? (opsStr.split(',') as any[]) : []
  return {
    query: params.get('q') || '',
    operations,
    propertyType: (params.get('tipo') as SearchFilters['propertyType']) || 'all',
    zoneId: params.get('zona') || 'all',
  }
}

type PageMode = 'home' | 'results' | 'detail' | 'publish' | 'my-properties' | 'account' | 'favorites' | 'edit' | 'auth-callback' | 'reset-password' | 'moderar'

function getInitialPageMode(): PageMode {
  if (typeof window === 'undefined') {
    return 'home'
  }
  const path = window.location.pathname
  if (path.startsWith('/resultados')) {
    return 'results'
  }
  if (path.startsWith('/propiedad/')) {
    return 'detail'
  }
  if (path.startsWith('/publicar')) {
    return 'publish'
  }
  if (path.startsWith('/mis-propiedades')) {
    return 'my-properties'
  }
  if (path.startsWith('/mi-cuenta')) {
    return 'account'
  }
  if (path.startsWith('/favoritos')) {
    return 'favorites'
  }
  if (path.startsWith('/editar/')) {
    return 'edit'
  }
  if (path.startsWith('/auth/callback')) {
    return 'auth-callback'
  }
  if (path.startsWith('/recuperar-contrasena')) {
    return 'reset-password'
  }
  if (path.startsWith('/moderar')) {
    return 'moderar'
  }
  return 'home'
}

function extractIdFromSlug(slug: string): string {
  if (!slug) return ''
  const parts = slug.split('-')
  if (parts.length >= 5) {
    const uuidCandidate = parts.slice(-5).join('-')
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(uuidCandidate)) {
      return uuidCandidate
    }
  }
  return slug
}

function getInitialSelectedPropertyId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  const path = window.location.pathname
  if (path.startsWith('/propiedad/')) {
    const raw = path.split('/').pop() || ''
    return extractIdFromSlug(raw)
  }
  return undefined
}

const locationSuggestions: LocationSuggestion[] = []

export function CubitatApp() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>(getInitialFilters)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(getInitialSelectedPropertyId)
  const { isLoginOpen, openLogin, closeLogin, isSavePromptOpen, closeSavePrompt } = useAuthModal()
  const [pageMode, setPageMode] = useState<PageMode>(getInitialPageMode)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [editPropertyId, setEditPropertyId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/editar/')) {
      return window.location.pathname.split('/').pop()
    }
    return undefined
  })
  const [userRole, setUserRole] = useState<string | undefined>()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    trackPageView()
  }, [pageMode, selectedPropertyId])

  // Manage authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch user role from profile
  useEffect(() => {
    if (!user) {
      setUserRole(undefined)
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setUserRole((data as any)?.role)
      })
  }, [user])

  // Guard protected routes from unauthenticated direct access
  useEffect(() => {
    const protectedPages: PageMode[] = ['publish', 'my-properties', 'account', 'favorites', 'edit', 'moderar']
    if (!isAuthLoading && protectedPages.includes(pageMode) && !user) {
      openLogin()
      window.history.pushState(null, '', '/')
      setPageMode('home')
      setSelectedPropertyId(undefined)
    }
  }, [isAuthLoading, pageMode, user])

  // Fetch properties from Supabase on mount
  useEffect(() => {
    async function loadProperties() {
      try {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
          .from('properties')
          .select('id,title,location,description,zone_id,operation,property_type,price_usd,bedrooms,bathrooms,parking,area_m2,age_years,amenities,badge,status,cover_tone,cover_image,images,coordinates,contact_info')
          .eq('status', 'published')
        
        if (error) throw error

        if (data) {
          // Map snake_case keys from DB to camelCase keys expected by Property type
          const mapped: Property[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            location: item.location,
            description: item.description,
            zoneId: item.zone_id,
            operation: item.operation,
            propertyType: item.property_type,
            priceUsd: item.price_usd ? Number(item.price_usd) : undefined,
            bedrooms: Number(item.bedrooms),
            bathrooms: Number(item.bathrooms),
            parking: Number(item.parking),
            areaM2: Number(item.area_m2),
            ageYears: item.age_years ? Number(item.age_years) : undefined,
            amenities: item.amenities || [],
            badge: item.badge || undefined,
            status: item.status,
            coverTone: item.cover_tone || '#f3f4f6',
            coverImage: item.cover_image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
            images: normalizePropertyImages(item.images),
            mapPoint: { x: 300, y: 200 }, // Default fallback coordinates for static assets
            coordinates: item.coordinates || { latitude: 23.1136, longitude: -82.3666 },
            contact_info: item.contact_info
          }))
          setProperties(mapped)
        }
      } catch (err: any) {
        console.error('Error loading properties from Supabase:', err)
        setError(err.message || 'Error al conectar con el servidor.')
      } finally {
        setLoading(false)
      }
    }

    loadProperties()
  }, [refreshCounter])

  const visibleProperties = useMemo(
    () => filterProperties(properties, filters),
    [properties, filters],
  )

  useEffect(() => {
    if (pageMode !== 'results') return

    const firstImage = visibleProperties[0]?.coverImage
      ? optimizePropertyCardImage(visibleProperties[0].coverImage)
      : undefined
    if (!firstImage) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = firstImage
    link.fetchPriority = 'high'
    document.head.appendChild(link)

    return () => { link.remove() }
  }, [pageMode, visibleProperties])

  const selectedProperty = properties.find(
    (property) => property.id === selectedPropertyId,
  )

  useEffect(() => {
    function handlePopState() {
      setPageMode(getInitialPageMode())
      setFilters(getInitialFilters())
      setSelectedPropertyId(getInitialSelectedPropertyId())
      window.scrollTo({ top: 0 })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Sync state to URL in results page mode
  useEffect(() => {
    if (pageMode !== 'results') {
      return
    }
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.operations.length > 0) params.set('operacion', filters.operations.join(','))
    if (filters.propertyType !== 'all') params.set('tipo', filters.propertyType)
    if (filters.zoneId !== 'all') params.set('zona', filters.zoneId)

    const queryString = params.toString()
    const path = queryString ? `/resultados?${queryString}` : '/resultados'

    const currentPath = window.location.pathname + window.location.search
    if (currentPath !== path) {
      window.history.pushState(null, '', path)
    }
  }, [filters, pageMode])

  function navigateHome() {
    window.history.pushState(null, '', '/')
    setPageMode('home')
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateLoginAfterPasswordReset() {
    navigateHome()
    window.setTimeout(openLogin, 0)
  }

  function navigateResults() {
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.operations.length > 0) params.set('operacion', filters.operations.join(','))
    if (filters.propertyType !== 'all') params.set('tipo', filters.propertyType)
    if (filters.zoneId !== 'all') params.set('zona', filters.zoneId)
    const queryString = params.toString()
    const path = queryString ? `/resultados?${queryString}` : '/resultados'

    window.history.pushState(null, '', path)
    setPageMode('results')
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigatePublish(loadDraft?: boolean) {
    if (!user) {
      openLogin()
      return
    }
    const path = loadDraft ? '/publicar?load_draft=true' : '/publicar'
    window.history.pushState(null, '', path)
    setPageMode('publish')
    setEditPropertyId(undefined)
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateMyProperties() {
    if (!user) {
      openLogin()
      return
    }
    window.history.pushState(null, '', '/mis-propiedades')
    setPageMode('my-properties')
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateAccount() {
    if (!user) {
      openLogin()
      return
    }
    window.history.pushState(null, '', '/mi-cuenta')
    setPageMode('account')
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateFavorites() {
    if (!user) {
      openLogin()
      return
    }
    window.history.pushState(null, '', '/favoritos')
    setPageMode('favorites')
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateModerar() {
    if (!user) {
      openLogin()
      return
    }
    window.history.pushState(null, '', '/moderar')
    setPageMode('moderar')
    setSelectedPropertyId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigateHome()
  }

  function navigateEditProperty(propertyId: string) {
    window.history.pushState(null, '', `/editar/${propertyId}`)
    setEditPropertyId(propertyId)
    setPageMode('edit')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /*
  function navigateToSection(sectionId: string) {
    if (pageMode !== 'home') {
      window.history.pushState(null, '', '/')
      setPageMode('home')
      setSelectedPropertyId(undefined)
      window.setTimeout(() => scrollTo(sectionId), 0)
      return
    }

    scrollTo(sectionId)
  }
  */

  function handleSelectProperty(propertyId: string, autoScrollToContact = false) {
    const prop = properties.find(p => p.id === propertyId)
    let urlPath = `/propiedad/${propertyId}`
    if (prop) {
      const typeStr = prop.propertyType === 'apartamento' ? 'apartamento' : prop.propertyType === 'casa' ? 'casa' : 'terreno'
      const opStr = prop.operation === 'alquiler' ? 'renta' : prop.operation === 'venta' ? 'venta' : 'permuta'
      const cleanLoc = prop.location
        ? prop.location
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
        : 'cuba'
      urlPath = `/propiedad/${typeStr}-en-${opStr}-en-${cleanLoc}-${propertyId}`
    }

    if (autoScrollToContact) {
      urlPath += '#contactar-anunciante'
    }

    setSelectedPropertyId(propertyId)
    setPageMode('detail')
    window.history.pushState(null, '', urlPath)

    if (autoScrollToContact) {
      setTimeout(() => {
        document.getElementById('contactar-anunciante')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handleBackToResults() {
    setSelectedPropertyId(undefined)
    setPageMode('results')
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.operations.length > 0) params.set('operacion', filters.operations.join(','))
    if (filters.propertyType !== 'all') params.set('tipo', filters.propertyType)
    if (filters.zoneId !== 'all') params.set('zona', filters.zoneId)
    const queryString = params.toString()
    const path = queryString ? `/resultados?${queryString}` : '/resultados'

    window.history.pushState(null, '', path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleClearFilters() {
    setFilters(initialFilters)
    setSelectedPropertyId(undefined)
  }

  async function handleAdminHideProperty(propertyId: string) {
    const reason = window.prompt('Motivo para ocultar esta publicación:', 'Ocultada por moderación.')?.trim()
    if (!reason) return

    const { error } = await supabase
      .from('properties')
      .update({ status: 'paused', moderation_message: reason })
      .eq('id', propertyId)

    if (error) {
      console.error('Error hiding property:', error)
      alert('No se pudo ocultar la publicación.')
      return
    }

    setProperties((current) => current.filter((property) => property.id !== propertyId))
    setRefreshCounter((prev) => prev + 1)
    navigateResults()
  }

  async function handleAdminDeleteProperty(propertyId: string) {
    const confirmed = window.confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')
    if (!confirmed) return

    const { error } = await supabase.from('properties').delete().eq('id', propertyId)

    if (error) {
      console.error('Error deleting property:', error)
      alert('No se pudo eliminar la publicación.')
      return
    }

    setProperties((current) => current.filter((property) => property.id !== propertyId))
    setRefreshCounter((prev) => prev + 1)
    navigateResults()
  }

  // Operation tab navigation in main header
  function handleOperationNavigation(op: 'venta' | 'alquiler' | 'permuta') {
    setFilters({ ...initialFilters, operations: [op] })
    setSelectedPropertyId(undefined)
    window.history.pushState(null, '', `/resultados?operacion=${op}`)
    setPageMode('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /*
  function scrollTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  */

  return (
    <main className={`app-shell ${pageMode === 'results' ? 'is-results-page' : ''} ${pageMode === 'detail' ? 'is-detail-page' : ''}`}>
      <Header
        user={user}
        userRole={userRole}
        navigateHome={navigateHome}
        navigateAccount={navigateAccount}
        navigateFavorites={navigateFavorites}
        navigateMyProperties={navigateMyProperties}
        navigateModerar={navigateModerar}
        navigatePublish={navigatePublish}
        navigateResults={navigateResults}
        openLogin={openLogin}
        handleOperationNavigation={handleOperationNavigation}
        onSignOut={handleSignOut}
      />

      <Suspense fallback={<PageLoadingState pageMode={pageMode} />}>

        {error && pageMode !== 'home' && (
          <div className="max-w-md mx-auto my-12 p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-2">
            <p className="text-xs font-bold text-red-700">Error al cargar datos</p>
            <p className="text-[11px] text-red-500">{error}</p>
            <Button 
              className="mt-2 bg-red-700 hover:bg-red-800 text-white rounded-full px-4 py-1.5 text-xs" 
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {pageMode === 'home' && (
          <HomePage
            filters={filters}
            locationSuggestions={locationSuggestions}
            onChangeFilters={setFilters}
            onClearFilters={handleClearFilters}
            onSubmitSearch={navigateResults}
          />
        )}

        {!error && pageMode === 'results' && (
          <>
            <ResultsPage
              filters={filters}
              properties={visibleProperties}
              selectedPropertyId={selectedPropertyId}
              loading={loading}
              onSelectProperty={handleSelectProperty}
              onClearFilters={handleClearFilters}
              onChangeFilters={setFilters}
            />
            <PopularLocations />
          </>
        )}

        {pageMode === 'detail' && loading && (
          <PageLoadingState pageMode={pageMode} />
        )}

        {!loading && !error && pageMode === 'detail' && selectedProperty && (
          <DetailPage
            property={selectedProperty}
            onBack={handleBackToResults}
            filters={filters}
            onChangeFilters={setFilters}
            userRole={userRole}
            onAdminHideProperty={handleAdminHideProperty}
            onAdminDeleteProperty={handleAdminDeleteProperty}
          />
        )}

        {!loading && !error && pageMode === 'detail' && !selectedProperty && (
          <div className="flex flex-col items-center justify-center py-20 min-h-screen text-center">
            <h2 className="text-xl font-bold text-neutral-800">Propiedad no encontrada</h2>
            <p className="text-neutral-500 mt-2">El inmueble que buscas no existe o fue despublicado.</p>
            <Button className="mt-4 bg-[#035f53] hover:bg-[#024a41] text-white rounded-full px-6" onClick={navigateHome}>Ir al inicio</Button>
          </div>
        )}

        {pageMode === 'publish' && (
          <PublishPage
            onBack={navigateHome}
            onSubmitSuccess={() => {
              setRefreshCounter((prev) => prev + 1)
              navigateHome()
            }}
          />
        )}

        {pageMode === 'edit' && editPropertyId && (
          <PublishPage
            editPropertyId={editPropertyId}
            onBack={navigateMyProperties}
            onSubmitSuccess={() => {
              setRefreshCounter((prev) => prev + 1)
              navigateMyProperties()
            }}
          />
        )}

        {pageMode === 'my-properties' && (
          <MyPropertiesPage
            onBack={navigateHome}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
            onEditProperty={navigateEditProperty}
            onNewProperty={navigatePublish}
          />
        )}

        {pageMode === 'account' && user && (
          <AccountPage
            user={user}
            onBack={navigateAccount}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
          />
        )}

        {pageMode === 'favorites' && (
          <FavoritesPage
            properties={properties}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
            onSelectProperty={handleSelectProperty}
            onGoResults={navigateResults}
          />
        )}

        {pageMode === 'auth-callback' && (
          <AuthCallbackPage onContinue={navigateHome} />
        )}

        {pageMode === 'reset-password' && (
          <ResetPasswordPage onDone={navigateLoginAfterPasswordReset} />
        )}

        {pageMode === 'moderar' && (
          <AdminPage userRole={userRole} onNavigateHome={navigateHome} />
        )}

        <SiteFooter />
      </Suspense>

      <PWAInstallPrompt />

      <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
        <button className={pageMode === 'home' ? 'is-active' : ''} type="button" onClick={navigateHome}>
          <Home size={17} />
          <span>Inicio</span>
        </button>
        <button className={pageMode === 'favorites' ? 'is-active' : ''} type="button" onClick={navigateFavorites}>
          <Heart size={17} />
          <span>Favoritos</span>
        </button>
        <button className={pageMode === 'publish' ? 'is-active' : ''} type="button" onClick={() => navigatePublish()}>
          <Building2 size={17} />
          <span>Vender</span>
        </button>
        <button className={pageMode === 'account' ? 'is-active' : ''} type="button" onClick={navigateAccount}>
          <UserRound size={17} />
          <span>Cuenta</span>
        </button>
      </nav>

      <Suspense fallback={null}>
        {isSavePromptOpen && <SavePromptModal onClose={closeSavePrompt} />}
        {isLoginOpen && <LoginModal onClose={closeLogin} />}
      </Suspense>
    </main>
  )
}

function PageLoadingState({ pageMode }: { pageMode?: PageMode }) {
  if (pageMode === 'results') {
    return (
      <section className="workspace-catalog results-loading-shell" aria-label="Cargando resultados">
        <div className="results-toolbar-full results-loading-toolbar" />
        <div className="catalog-container">
          <div className="results-heading results-loading-heading">
            <div>
              <div className="loading-line loading-line-eyebrow" />
              <div className="loading-line loading-line-title" />
            </div>
            <div className="loading-pill" />
          </div>
          <div className="loading-line loading-line-summary" />
          <div className="property-catalog-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="property-card property-card-loading" key={index}>
                <div className="property-photo" />
                <div className="property-info">
                  <div className="loading-line loading-line-price" />
                  <div className="loading-line loading-line-card-title" />
                  <div className="loading-line loading-line-card-meta" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (pageMode === 'detail') {
    return (
      <div className="detail-loading-shell">
        {/* Gallery skeleton */}
        <div className="detail-loading-gallery">
          <div className="detail-loading-gallery-main loading-line" style={{ borderRadius: '12px' }} />
          <div className="detail-loading-gallery-side">
            <div className="detail-loading-gallery-thumb loading-line" style={{ borderRadius: '12px' }} />
            <div className="detail-loading-gallery-thumb loading-line" style={{ borderRadius: '12px' }} />
          </div>
        </div>

        {/* Content columns */}
        <div className="detail-loading-content">
          {/* Main Info */}
          <div className="detail-loading-info">
            <div className="loading-line loading-line-eyebrow" />
            <div className="loading-line" style={{ width: '80%', height: '36px', marginBottom: '8px' }} />
            <div className="loading-line" style={{ width: '40%', height: '18px', marginBottom: '16px' }} />
            
            <div className="flex gap-3 items-center">
              <div className="loading-pill" style={{ width: '130px', height: '44px' }} />
              <div className="loading-line" style={{ width: '80px', height: '16px' }} />
            </div>

            {/* Quick Stats Circles */}
            <div className="detail-loading-meta-circles">
              <div className="detail-loading-circle" />
              <div className="detail-loading-circle" />
              <div className="detail-loading-circle" />
              <div className="detail-loading-circle" />
            </div>

            {/* Description lines */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="loading-line" style={{ width: '100%', height: '16px' }} />
              <div className="loading-line" style={{ width: '95%', height: '16px' }} />
              <div className="loading-line" style={{ width: '90%', height: '16px' }} />
              <div className="loading-line" style={{ width: '60%', height: '16px' }} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="detail-loading-sidebar">
            <div className="detail-loading-card">
              <div className="detail-loading-avatar" />
              <div className="loading-line" style={{ width: '60%', height: '18px', marginBottom: '4px' }} />
              <div className="loading-line" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
              <div className="detail-loading-button" />
              <div className="detail-loading-button" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-screen text-center space-y-3">
      <span className="inline-block w-8 h-8 border-4 border-[#035f53] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold text-neutral-500">Cargando las mejores propiedades en Cuba...</p>
    </div>
  )
}

// SiteFooter is now imported from components/layout/SiteFooter
