import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Building2, Heart, Home, UserRound } from 'lucide-react'
import { useAuthModal } from '../modules/auth/contexts/AuthModalContext'
import { filterProperties } from '../modules/properties/services/filterProperties'
import type { Property } from '../modules/properties/types'
import { PUBLIC_PROPERTY_SELECT } from '../modules/properties/publicPropertySelect'
import { OPERATION_VALUES } from '../shared/lib/propertyTaxonomy'
import { getPropertyContactInfo } from '../modules/properties/utils/contact'
import { getPropertyCoverImage, normalizePropertyImages, optimizePropertyCardImage } from '../modules/properties/utils/images'
import type { LocationSuggestion, SearchFilters } from '../modules/search/types'
import { buildSeoResultsPath, filtersMatchSeoRoute, parseSeoResultsRoute, type SeoResultsRoute } from '../modules/search/seoRoutes'
import { HomePage } from '../pages/home/HomePage'
import { Button } from '../shared/ui/button'
import { supabase } from '../shared/lib/supabaseClient'
import { initAnalytics, trackPageView } from '../shared/lib/analytics'
import { Header } from '../components/layout/Header'
import { SiteFooter } from '../components/layout/SiteFooter'
import { PWAInstallPrompt } from '../components/layout/PWAInstallPrompt'
import { clearCachedProperties, saveCachedProperties, getCachedProperties, saveSingleCachedProperty, getCachedProperty } from '../shared/lib/offlineCache'
import { removeLegacyPublicationDraft } from '../pages/publish/draftStorage'
import { logSafeEvent, sanitizeErrorReason } from '../shared/lib/logger'
import { PHASE_FOUR_MAT_ENABLED, PHASE_FOUR_REV_ENABLED, PHASE_FOUR_SVC_ENABLED, PHASE_FOUR_VAL_ENABLED, PHASE_TWO_ENABLED } from '../shared/config/features'
import { AccountPage } from '../pages/account/AccountPage'
import { approximatePropertyCoordinates } from '../modules/maps/lib/propertyCoordinates'
import { disablePushNotifications, reconcilePushSession } from '../modules/notifications/push/pushService'
import {
  clearPushNotificationId,
  getPushNotificationId,
  markNotificationAsRead,
} from '../modules/notifications/notificationRead'
import { trackReferral } from '../modules/referrals/utils/tracker'

const fetchVerifiedAgentIdsInPhaseTwoDev = import.meta.env.DEV
  ? () => import('../modules/agents/agentRepository').then((module) => module.fetchVerifiedAgentIds())
  : null
const fetchVerifiedSellerIdsInPhaseTwo = PHASE_TWO_ENABLED
  ? () => import('../modules/agents/agentRepository').then((module) => module.fetchVerifiedSellerIds())
  : null

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

const PHASE_TWO_LAZY_UI_ENABLED = import.meta.env.DEV || import.meta.env.VITE_PHASE2_UI_ENABLED === 'true'
const PHASE_THREE_UI_ENABLED = import.meta.env.VITE_PHASE3_UI_ENABLED === 'true'

const AgentProfilePage = PHASE_TWO_LAZY_UI_ENABLED
  ? lazy(() =>
      import('../pages/agents/AgentProfilePage').then((module) => ({ default: module.AgentProfilePage })),
    )
  : null
const AgentDashboardPage = PHASE_TWO_LAZY_UI_ENABLED
  ? lazy(() =>
      import('../pages/agents/AgentDashboardPage').then((module) => ({ default: module.AgentDashboardPage })),
    )
  : null
const AgentApplicationPage = PHASE_THREE_UI_ENABLED
  ? lazy(() =>
      import('../pages/agents/AgentApplicationPage').then((module) => ({ default: module.AgentApplicationPage })),
    )
  : null
const ServiceDirectoryPage = PHASE_FOUR_SVC_ENABLED
  ? lazy(() => import('../pages/services/ServiceDirectoryPage').then((module) => ({ default: module.ServiceDirectoryPage })))
  : null
const MaterialsMarketplacePage = PHASE_FOUR_MAT_ENABLED
  ? lazy(() => import('../pages/materials/MaterialsMarketplacePage').then((module) => ({ default: module.MaterialsMarketplacePage })))
  : null
const ServiceProviderSubmissionPage = PHASE_FOUR_SVC_ENABLED
  ? lazy(() => import('../pages/services/ServiceProviderSubmissionPage').then((module) => ({ default: module.ServiceProviderSubmissionPage })))
  : null
const MaterialListingSubmissionPage = PHASE_FOUR_MAT_ENABLED
  ? lazy(() => import('../pages/materials/MaterialListingSubmissionPage').then((module) => ({ default: module.MaterialListingSubmissionPage })))
  : null
const MyServiceProfilesPage = PHASE_FOUR_SVC_ENABLED
  ? lazy(() => import('../pages/services/MyServiceProfilesPage').then((module) => ({ default: module.MyServiceProfilesPage })))
  : null
const MyMaterialListingsPage = PHASE_FOUR_MAT_ENABLED
  ? lazy(() => import('../pages/materials/MyMaterialListingsPage').then((module) => ({ default: module.MyMaterialListingsPage })))
  : null
const PropertyValuationPage = PHASE_FOUR_VAL_ENABLED
  ? lazy(() => import('../pages/valuation/PropertyValuationPage').then((module) => ({ default: module.PropertyValuationPage })))
  : null
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
const PrivacyPage = lazy(() =>
  import('../pages/legal/PrivacyPage').then((module) => ({ default: module.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('../pages/legal/TermsPage').then((module) => ({ default: module.TermsPage })),
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
  const seoRoute = parseSeoResultsRoute(window.location.pathname)
  if (seoRoute) {
    return seoRoute.filters
  }
  const params = new URLSearchParams(window.location.search)
  const opsStr = params.get('operacion')
  const operations = opsStr
    ? opsStr.split(',').filter(
        (operation): operation is SearchFilters['operations'][number] =>
          OPERATION_VALUES.includes(operation as (typeof OPERATION_VALUES)[number]),
      )
    : []
  return {
    query: params.get('q') || '',
    operations,
    propertyType: (params.get('tipo') as SearchFilters['propertyType']) || 'all',
    zoneId: params.get('zona') || 'all',
  }
}

type PageMode = 'home' | 'results' | 'detail' | 'publish' | 'my-properties' | 'account' | 'favorites' | 'edit' | 'auth-callback' | 'reset-password' | 'moderar' | 'privacy' | 'terms' | 'agent-profile' | 'agent-dashboard' | 'agent-application' | 'services' | 'materials' | 'service-submit' | 'material-submit' | 'my-services' | 'my-materials' | 'valuation'

function getInitialPageMode(): PageMode {
  if (typeof window === 'undefined') {
    return 'home'
  }
  const path = window.location.pathname
  if (PHASE_FOUR_VAL_ENABLED && path === '/valorar') return 'valuation'
  if (PHASE_FOUR_SVC_ENABLED && path.startsWith('/publicar-servicio')) return 'service-submit'
  if (PHASE_FOUR_SVC_ENABLED && path.startsWith('/mis-servicios')) return 'my-services'
  if (PHASE_FOUR_MAT_ENABLED && path.startsWith('/publicar-material')) return 'material-submit'
  if (PHASE_FOUR_MAT_ENABLED && path.startsWith('/mis-materiales')) return 'my-materials'
  if (PHASE_FOUR_SVC_ENABLED && path.startsWith('/servicios')) return 'services'
  if (PHASE_FOUR_MAT_ENABLED && path.startsWith('/materiales')) return 'materials'
  if (PHASE_THREE_UI_ENABLED && path === '/postular-agente') {
    return 'agent-application'
  }
  if (PHASE_TWO_ENABLED && path.startsWith('/panel-agente')) {
    return 'agent-dashboard'
  }
  if (PHASE_TWO_ENABLED && path.startsWith('/agente/')) {
    return 'agent-profile'
  }
  if (path.startsWith('/resultados') || parseSeoResultsRoute(path)) {
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
  if (path.startsWith('/mi-cuenta') || path.startsWith('/cuenta')) {
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
  if (path.startsWith('/privacidad')) {
    return 'privacy'
  }
  if (path.startsWith('/terminos')) {
    return 'terms'
  }
  return 'home'
}

function getInitialSelectedAgentId(): string | undefined {
  if (!PHASE_TWO_ENABLED || typeof window === 'undefined') {
    return undefined
  }
  const path = window.location.pathname
  if (path.startsWith('/agente/')) {
    return path.split('/').pop() || undefined
  }
  return undefined
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
  const [seoResultsRoute, setSeoResultsRoute] = useState<SeoResultsRoute | null>(() => {
    if (typeof window === 'undefined') return null
    return parseSeoResultsRoute(window.location.pathname)
  })
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(getInitialSelectedPropertyId)
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(getInitialSelectedAgentId)
  const { isLoginOpen, openLogin, closeLogin, isSavePromptOpen, closeSavePrompt } = useAuthModal()
  const [pageMode, setPageMode] = useState<PageMode>(getInitialPageMode)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [pendingAuthPath, setPendingAuthPath] = useState<string | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [editPropertyId, setEditPropertyId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/editar/')) {
      return window.location.pathname.split('/').pop()
    }
    return undefined
  })
  const [userRole, setUserRole] = useState<string | undefined>()
  const [detailBackPageMode, setDetailBackPageMode] = useState<'results' | 'my-properties' | 'favorites'>('results')

  useEffect(() => {
     initAnalytics()
   }, [])

  useEffect(() => {
    trackReferral()
  }, [])

  useEffect(() => {
    if (!user) return
    const notificationId = getPushNotificationId(window.location.search)
    if (!notificationId) return

    void markNotificationAsRead(user.id, notificationId)
      .then(clearPushNotificationId)
      .catch((error) => {
        logSafeEvent({
          module: 'alerts',
          action: 'mark_push_notification_read',
          level: 'warn',
          code: sanitizeErrorReason(error),
        })
      })
  }, [user])

  useEffect(() => {
    const cacheVersion = '20260710-clear-stale-pwa-v2'
    if (window.localStorage.getItem(cacheVersion) === 'done') return

    async function clearStalePwaState() {
      try {
        if ('caches' in window) {
          const cacheNames = await window.caches.keys()
          await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
        }

        window.localStorage.setItem(cacheVersion, 'done')
      } catch (error) {
        logSafeEvent({
          module: 'app',
          action: 'clear_stale_pwa_cache',
          level: 'warn',
          code: sanitizeErrorReason(error),
        })
      }
    }

    clearStalePwaState()
  }, [])

  useEffect(() => {
    trackPageView()
  }, [pageMode, selectedPropertyId])

  // Manage authentication state
  useEffect(() => {
    let authChanged = false
    function updateAuth(nextUser: User | null) {
      void reconcilePushSession(nextUser?.id ?? null).catch((error) => {
        logSafeEvent({
          module: 'auth',
          action: 'push_session_cleanup_failed',
          level: 'warn',
          code: sanitizeErrorReason(error),
        })
      })
      setUser(nextUser)
      setIsAuthLoading(false)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authChanged) updateAuth(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true
      updateAuth(session?.user ?? null)
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
        const role = data && typeof data === 'object' && 'role' in data
          && typeof data.role === 'string'
          ? data.role
          : undefined
        setUserRole(role)
      })
  }, [user])

  // Guard protected routes from unauthenticated direct access
  useEffect(() => {
    const protectedPages: PageMode[] = ['publish', 'my-properties', 'account', 'favorites', 'edit', 'moderar', 'agent-dashboard', 'service-submit', 'material-submit', 'my-services', 'my-materials', ...(PHASE_THREE_UI_ENABLED ? ['agent-application' as const] : [])]
    if (!isAuthLoading && protectedPages.includes(pageMode) && !user) {
      setPendingAuthPath(window.location.pathname + window.location.search + window.location.hash)
      openLogin()
      window.history.pushState(null, '', '/')
      setPageMode('home')
      setSelectedPropertyId(undefined)
    }
  }, [isAuthLoading, openLogin, pageMode, user])

  useEffect(() => {
    if (!user || !pendingAuthPath) return

    const targetPath = pendingAuthPath
    setPendingAuthPath(null)
    closeLogin()
    window.history.pushState(null, '', targetPath)
    setPageMode(getInitialPageMode())
    setFilters(getInitialFilters())
    setSelectedPropertyId(getInitialSelectedPropertyId())
    setSeoResultsRoute(parseSeoResultsRoute(window.location.pathname))
    window.scrollTo({ top: 0 })
  }, [closeLogin, pendingAuthPath, user])

  // Fetch properties from Supabase on mount
  useEffect(() => {
    let active = true

    async function loadProperties() {
      let hasUsableCache = false

      // 1. Cargar cache local de forma inmediata
      try {
        const cached = await getCachedProperties()
        if (active && cached && cached.length > 0) {
          hasUsableCache = true
          setProperties(cached.map(property => ({
            ...property,
            coverImage: getPropertyCoverImage(property.coverImage),
            images: normalizePropertyImages(property.images),
          })))
          setLoading(false) // Ocultar el esqueleto ya que tenemos datos en caché
        }
      } catch (cacheErr) {
        logSafeEvent({
          module: 'app',
          action: 'load_initial_cache',
          level: 'warn',
          code: sanitizeErrorReason(cacheErr),
        })
      }

      // 2. Ejecutar la llamada de red en segundo plano (SWR)
      try {
        // Si aún no tenemos propiedades de la caché, mantener el loading activo
        if (!hasUsableCache && active) {
          setLoading(true)
        }
        if (active) {
          setError(null)
        }
        const [{ data, error }, verifiedAgentIds, verifiedSellerIds] = await Promise.all([
          supabase
            .from('properties')
            .select(PUBLIC_PROPERTY_SELECT)
            .eq('status', 'published'),
          PHASE_TWO_ENABLED && fetchVerifiedAgentIdsInPhaseTwoDev
            ? fetchVerifiedAgentIdsInPhaseTwoDev().catch(() => new Set<string>())
            : Promise.resolve(new Set<string>()),
          PHASE_TWO_ENABLED && fetchVerifiedSellerIdsInPhaseTwo
            ? fetchVerifiedSellerIdsInPhaseTwo().catch(() => new Set<string>())
            : Promise.resolve(new Set<string>()),
        ])
        
        if (error) throw error

        if (data && active) {
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
            priceCurrency: item.price_currency === 'CUP' || item.price_currency === 'MLC' ? item.price_currency : 'USD',
            bedrooms: Number(item.bedrooms),
            bathrooms: Number(item.bathrooms),
            parking: Number(item.parking),
            areaM2: Number(item.area_m2),
            ageYears: item.age_years ? Number(item.age_years) : undefined,
            amenities: item.amenities || [],
            badge: item.badge || undefined,
            status: item.status,
            coverTone: item.cover_tone || '#f3f4f6',
            coverImage: getPropertyCoverImage(item.cover_image),
            images: normalizePropertyImages(item.images),
            features: item.features || undefined,
            mapPoint: { x: 300, y: 200 }, // Default fallback coordinates for static assets
            coordinates: approximatePropertyCoordinates(item.coordinates, item.location) || { latitude: 23.12, longitude: -82.36 },
            contact_info: getPropertyContactInfo(item.id, undefined),
            user_id: item.user_id || undefined,
            isVerifiedAgent: Boolean(item.user_id && verifiedAgentIds.has(item.user_id)),
            isVerifiedSeller: Boolean(item.user_id && verifiedSellerIds.has(item.user_id)),
          }))
          setProperties(mapped)
          void saveCachedProperties(mapped) // Guardar copia para uso offline
        }
      } catch (err: unknown) {
        logSafeEvent({
          module: 'app',
          action: 'load_properties_supabase',
          level: 'error',
          code: sanitizeErrorReason(err),
        })
        // Solo mostramos el error si no hay absolutamente ningún dato en memoria
        if (active && !hasUsableCache) {
          setError(err instanceof Error ? err.message : 'Error al conectar con el servidor.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProperties()

    return () => {
      active = false
    }
  }, [refreshCounter])

  // Fetch a single property on demand if not found in preloaded properties array (e.g., drafts/pending_review)
  useEffect(() => {
    if (!selectedPropertyId) return
    const found = properties.some((p) => p.id === selectedPropertyId)
    if (found) return

    async function fetchSingleProperty() {
      try {
        const [{ data, error }, verifiedAgentIds, verifiedSellerIds] = await Promise.all([
          supabase
            .from('properties')
            .select(PUBLIC_PROPERTY_SELECT)
            .eq('id', selectedPropertyId)
            .single(),
          PHASE_TWO_ENABLED && fetchVerifiedAgentIdsInPhaseTwoDev
            ? fetchVerifiedAgentIdsInPhaseTwoDev().catch(() => new Set<string>())
            : Promise.resolve(new Set<string>()),
          PHASE_TWO_ENABLED && fetchVerifiedSellerIdsInPhaseTwo
            ? fetchVerifiedSellerIdsInPhaseTwo().catch(() => new Set<string>())
            : Promise.resolve(new Set<string>()),
        ])

        if (error) throw error
        if (data) {
          const item: any = data
          const mapped: Property = {
            id: item.id,
            title: item.title,
            location: item.location,
            description: item.description,
            zoneId: item.zone_id,
            operation: item.operation,
            propertyType: item.property_type,
            priceUsd: item.price_usd ? Number(item.price_usd) : undefined,
            priceCurrency: item.price_currency === 'CUP' || item.price_currency === 'MLC' ? item.price_currency : 'USD',
            bedrooms: Number(item.bedrooms),
            bathrooms: Number(item.bathrooms),
            parking: Number(item.parking),
            areaM2: Number(item.area_m2),
            ageYears: item.age_years ? Number(item.age_years) : undefined,
            amenities: item.amenities || [],
            badge: item.badge || undefined,
            status: item.status,
            coverTone: item.cover_tone || '#f3f4f6',
            coverImage: getPropertyCoverImage(item.cover_image),
            images: normalizePropertyImages(item.images),
            features: item.features || undefined,
            mapPoint: { x: 300, y: 200 },
            coordinates: item.coordinates || { latitude: 23.1136, longitude: -82.3666 },
            contact_info: getPropertyContactInfo(item.id, undefined),
            user_id: item.user_id || undefined,
            isVerifiedAgent: Boolean(item.user_id && verifiedAgentIds.has(item.user_id)),
            isVerifiedSeller: Boolean(item.user_id && verifiedSellerIds.has(item.user_id)),
          }
          setProperties((prev) => {
            if (prev.some((p) => p.id === mapped.id)) return prev
            return [...prev, mapped]
          })
          saveSingleCachedProperty(mapped) // Cachear individualmente para offline
        }
      } catch (err) {
        logSafeEvent({
          module: 'app',
          action: 'fetch_single_property',
          level: 'warn',
          code: sanitizeErrorReason(err),
        })
        const cached = await getCachedProperty(selectedPropertyId!)
        if (cached) {
          setProperties((prev) => {
            if (prev.some((p) => p.id === cached.id)) return prev
            return [...prev, cached]
          })
        }
      }
    }

    fetchSingleProperty()
  }, [selectedPropertyId, properties])

  const visibleProperties = useMemo(
    () => filterProperties(properties, filters),
    [properties, filters],
  )

  useEffect(() => {
    if (pageMode !== 'results') return

    const priorityImages = visibleProperties
      .slice(0, 2)
      .map((property) => property.coverImage ? optimizePropertyCardImage(property.coverImage) : undefined)
      .filter((image): image is string => Boolean(image))

    const links = priorityImages.map((image) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = image
      link.fetchPriority = 'high'
      document.head.appendChild(link)
      return link
    })

    return () => { links.forEach((link) => link.remove()) }
  }, [pageMode, visibleProperties])

  const selectedProperty = properties.find(
    (property) => property.id === selectedPropertyId,
  )

  useEffect(() => {
    function handlePopState() {
      setPageMode(getInitialPageMode())
      setFilters(getInitialFilters())
      setSelectedPropertyId(getInitialSelectedPropertyId())
      setSeoResultsRoute(parseSeoResultsRoute(window.location.pathname))
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
    if (seoResultsRoute && filtersMatchSeoRoute(filters, seoResultsRoute)) {
      return
    }
    if (seoResultsRoute) {
      setSeoResultsRoute(null)
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
  }, [filters, pageMode, seoResultsRoute])

  function navigateHome() {
    window.history.pushState(null, '', '/')
    setPageMode('home')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateLoginAfterPasswordReset() {
    navigateHome()
    window.setTimeout(openLogin, 0)
  }

  function navigateResults() {
    const seoPath = buildSeoResultsPath(filters)
    if (seoPath) {
      const seoRoute = parseSeoResultsRoute(seoPath)
      window.history.pushState(null, '', seoPath)
      setPageMode('results')
      setSeoResultsRoute(seoRoute)
      if (seoRoute) {
        setFilters(seoRoute.filters)
      }
      setSelectedPropertyId(undefined)
      window.scrollTo(0, 0)
      return
    }

    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.operations.length > 0) params.set('operacion', filters.operations.join(','))
    if (filters.propertyType !== 'all') params.set('tipo', filters.propertyType)
    if (filters.zoneId !== 'all') params.set('zona', filters.zoneId)
    const queryString = params.toString()
    const path = queryString ? `/resultados?${queryString}` : '/resultados'

    window.history.pushState(null, '', path)
    setPageMode('results')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigatePublish(loadDraft?: boolean) {
    const path = loadDraft ? '/publicar?load_draft=true' : '/publicar'
    if (!user) {
      setPendingAuthPath(path)
      openLogin()
      return
    }
    window.history.pushState(null, '', path)
    setPageMode('publish')
    setSeoResultsRoute(null)
    setEditPropertyId(undefined)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateMyProperties() {
    if (!user) {
      setPendingAuthPath('/mis-propiedades')
      openLogin()
      return
    }
    window.history.pushState(null, '', '/mis-propiedades')
    setPageMode('my-properties')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateAccount() {
    if (!user) {
      setPendingAuthPath('/mi-cuenta')
      openLogin()
      return
    }
    window.history.pushState(null, '', '/mi-cuenta')
    setPageMode('account')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateFavorites() {
    if (!user) {
      setPendingAuthPath('/favoritos')
      openLogin()
      return
    }
    window.history.pushState(null, '', '/favoritos')
    setPageMode('favorites')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateModerar() {
    if (!user) {
      setPendingAuthPath('/moderar')
      openLogin()
      return
    }
    window.history.pushState(null, '', '/moderar')
    setPageMode('moderar')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateAgentDashboard() {
    if (!PHASE_TWO_ENABLED) {
      navigateAccount()
      return
    }
    if (!user) {
      setPendingAuthPath('/panel-agente')
      openLogin()
      return
    }
    window.history.pushState(null, '', '/panel-agente')
    setPageMode('agent-dashboard')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateAgentApplication() {
    if (!PHASE_THREE_UI_ENABLED) return
    if (!user) {
      setPendingAuthPath('/postular-agente')
      openLogin()
      return
    }
    window.history.pushState(null, '', '/postular-agente')
    setPageMode('agent-application')
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateServices() {
    if (!PHASE_FOUR_SVC_ENABLED) return
    window.history.pushState(null, '', '/servicios')
    setPageMode('services')
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateMaterials() {
    if (!PHASE_FOUR_MAT_ENABLED) return
    window.history.pushState(null, '', '/materiales')
    setPageMode('materials')
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateServiceDetail(slug: string) {
    if (!PHASE_FOUR_SVC_ENABLED) return
    window.history.pushState(null, '', `/servicios/${encodeURIComponent(slug)}`)
    setPageMode('services')
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateMaterialDetail(slug: string) {
    if (!PHASE_FOUR_MAT_ENABLED) return
    window.history.pushState(null, '', `/materiales/${encodeURIComponent(slug)}`)
    setPageMode('materials')
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateValuation() {
    if (!PHASE_FOUR_VAL_ENABLED) return
    window.history.pushState(null, '', '/valorar')
    setPageMode('valuation')
    setSelectedPropertyId(undefined)
    window.scrollTo(0, 0)
  }

  function navigateServiceSubmission() {
    const path = '/publicar-servicio'
    if (!user) { setPendingAuthPath(path); openLogin(); return }
    window.history.pushState(null, '', path)
    setPageMode('service-submit')
    window.scrollTo(0, 0)
  }

  function navigateMyServiceProfiles() {
    const path = '/mis-servicios'
    if (!user) { setPendingAuthPath(path); openLogin(); return }
    window.history.pushState(null, '', path)
    setPageMode('my-services')
    window.scrollTo(0, 0)
  }

  function navigateEditServiceProfile(profileId: string) {
    window.history.pushState(null, '', `/publicar-servicio?edit=${encodeURIComponent(profileId)}`)
    setPageMode('service-submit')
    window.scrollTo(0, 0)
  }

  function navigateMaterialSubmission() {
    const path = '/publicar-material'
    if (!user) { setPendingAuthPath(path); openLogin(); return }
    window.history.pushState(null, '', path)
    setPageMode('material-submit')
    window.scrollTo(0, 0)
  }

  function navigateMyMaterialListings() {
    const path = '/mis-materiales'
    if (!user) { setPendingAuthPath(path); openLogin(); return }
    window.history.pushState(null, '', path)
    setPageMode('my-materials')
    window.scrollTo(0, 0)
  }

  function navigateEditMaterialListing(listingId: string) {
    window.history.pushState(null, '', `/publicar-material?edit=${encodeURIComponent(listingId)}`)
    setPageMode('material-submit')
    window.scrollTo(0, 0)
  }

  async function handleSignOut() {
    try {
      await disablePushNotifications()
    } catch (error) {
      // The local display binding is already invalidated; offline cleanup must not block logout.
      logSafeEvent({
        module: 'auth',
        action: 'push_session_cleanup_failed',
        level: 'warn',
        code: sanitizeErrorReason(error),
      })
    }
    await supabase.auth.signOut()
    await clearCachedProperties()
    removeLegacyPublicationDraft()
    navigateHome()
  }

  async function handleExpiredAdminSession() {
    await handleSignOut()
    window.setTimeout(openLogin, 0)
  }

  function navigateEditProperty(propertyId: string) {
    window.history.pushState(null, '', `/editar/${propertyId}`)
    setEditPropertyId(propertyId)
    setPageMode('edit')
    setSeoResultsRoute(null)
    window.scrollTo(0, 0)
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

  function handleSelectProperty(propertyId: string, autoScrollToContact = false, backMode?: 'results' | 'my-properties' | 'favorites') {
    const finalBackMode = backMode || (pageMode === 'results' || pageMode === 'my-properties' || pageMode === 'favorites' ? pageMode : 'results')
    setDetailBackPageMode(finalBackMode)

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
    setSeoResultsRoute(null)
    window.history.pushState(null, '', urlPath)

    if (autoScrollToContact) {
      setTimeout(() => {
        document.getElementById('contactar-anunciante')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    } else {
      window.scrollTo(0, 0)
    }
  }

  function handleSelectAgent(agentId: string) {
    if (!PHASE_TWO_ENABLED) return
    setSelectedAgentId(agentId)
    setPageMode('agent-profile')
    window.history.pushState(null, '', `/agente/${agentId}`)
    window.scrollTo(0, 0)
  }

  function handleBackToResults() {
    setSelectedPropertyId(undefined)
    setPageMode(detailBackPageMode)

    if (detailBackPageMode === 'my-properties') {
      window.history.pushState(null, '', '/mis-propiedades')
    } else if (detailBackPageMode === 'favorites') {
      window.history.pushState(null, '', '/favoritos')
    } else {
      setSeoResultsRoute(null)
      const params = new URLSearchParams()
      if (filters.query) params.set('q', filters.query)
      if (filters.operations.length > 0) params.set('operacion', filters.operations.join(','))
      if (filters.propertyType !== 'all') params.set('tipo', filters.propertyType)
      if (filters.zoneId !== 'all') params.set('zona', filters.zoneId)
      const queryString = params.toString()
      const path = queryString ? `/resultados?${queryString}` : '/resultados'

      window.history.pushState(null, '', path)
    }
    window.scrollTo(0, 0)
  }

  function handleClearFilters() {
    setFilters(initialFilters)
    setSeoResultsRoute(null)
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
      logSafeEvent({
        module: 'app',
        action: 'admin_hide_property',
        level: 'error',
        code: sanitizeErrorReason(error),
      })
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
      logSafeEvent({
        module: 'app',
        action: 'admin_delete_property',
        level: 'error',
        code: sanitizeErrorReason(error),
      })
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
    setSeoResultsRoute(null)
    setSelectedPropertyId(undefined)
    window.history.pushState(null, '', `/resultados?operacion=${op}`)
    setPageMode('results')
    window.scrollTo(0, 0)
  }

  /*
  function scrollTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  */

  const appShellClass = [
    'app-shell',
    pageMode === 'results' ? 'is-results-page' : '',
    pageMode === 'services' || pageMode === 'materials' ? 'is-directory-page' : '',
    pageMode === 'detail' ? 'is-detail-page' : '',
    pageMode === 'publish' || pageMode === 'edit' ? 'is-publish-page' : '',
  ].filter(Boolean).join(' ')
  const isRecoveryPage = pageMode === 'reset-password'

  return (
    <main className={appShellClass}>
      {isRecoveryPage ? (
        <header className="recovery-brand-header" aria-label="tuGao">
          <div className="recovery-brand">
            <img
              className="recovery-brand-logo"
              src="/brand/tugao/logo-horizontal.webp"
              alt="tuGao · atrapa tu sueño"
              width={464}
              height={132}
            />
          </div>
        </header>
      ) : (
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
          navigateServices={PHASE_FOUR_SVC_ENABLED ? navigateServices : undefined}
          navigateMaterials={PHASE_FOUR_MAT_ENABLED ? navigateMaterials : undefined}
          navigateValuation={PHASE_FOUR_VAL_ENABLED ? navigateValuation : undefined}
          openLogin={openLogin}
          handleOperationNavigation={handleOperationNavigation}
          onSignOut={handleSignOut}
        />
      )}

      <Suspense fallback={<PageLoadingState pageMode={pageMode} />}>

        {error && (pageMode === 'results' || pageMode === 'detail') && (
          <div className="max-w-md mx-auto my-12 p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-2">
            <p className="text-xs font-bold text-red-700">Error al cargar datos</p>
            <p className="text-[11px] text-red-500">{error}</p>
            <Button 
              className="mt-2 min-h-12 bg-red-700 hover:bg-red-800 text-white rounded-full px-4 py-1.5 text-xs"
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
          <ResultsPage
            filters={filters}
            properties={visibleProperties}
            selectedPropertyId={selectedPropertyId}
            loading={loading}
            onSelectProperty={handleSelectProperty}
            onClearFilters={handleClearFilters}
            onChangeFilters={setFilters}
            seoRoute={seoResultsRoute}
            user={user}
            onRequireLogin={openLogin}
            onGoToAccount={navigateAccount}
          />
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
            onSelectAgent={PHASE_TWO_ENABLED ? handleSelectAgent : undefined}
          />
        )}

        {PHASE_TWO_ENABLED && AgentProfilePage && pageMode === 'agent-profile' && selectedAgentId && (
          <AgentProfilePage
            agentId={selectedAgentId}
            onBack={() => {
              if (selectedPropertyId) {
                setPageMode('detail')
                window.history.pushState(null, '', `/propiedad/${selectedPropertyId}`)
              } else {
                setPageMode('results')
                window.history.pushState(null, '', '/resultados')
              }
            }}
            onSelectProperty={handleSelectProperty}
          />
        )}

        {!loading && !error && pageMode === 'detail' && !selectedProperty && (
          <div className="flex flex-col items-center justify-center py-20 min-h-screen text-center">
            <h2 className="text-xl font-bold text-neutral-800">Propiedad no encontrada</h2>
            <p className="text-neutral-500 mt-2">El inmueble que buscas no existe o fue despublicado.</p>
            <Button className="mt-4 bg-[#035f53] hover:bg-[#024a41] text-white rounded-full px-6" onClick={navigateHome}>Ir al inicio</Button>
          </div>
        )}

        {pageMode === 'publish' && user && (
          <PublishPage
            userId={user.id}
            resumeDraft={new URLSearchParams(window.location.search).get('load_draft') === 'true'}
            onBack={navigateHome}
            onSubmitSuccess={() => {
              setRefreshCounter((prev) => prev + 1)
              navigateHome()
            }}
          />
        )}

        {pageMode === 'edit' && editPropertyId && user && (
          <PublishPage
            userId={user.id}
            editPropertyId={editPropertyId}
            onBack={navigateMyProperties}
            onSubmitSuccess={() => {
              setRefreshCounter((prev) => prev + 1)
              navigateMyProperties()
            }}
          />
        )}

        {pageMode === 'my-properties' && user && (
          <MyPropertiesPage
            userId={user.id}
            onBack={navigateHome}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
            onNavigateAgentDashboard={PHASE_TWO_ENABLED ? navigateAgentDashboard : undefined}
            onEditProperty={navigateEditProperty}
            onNewProperty={navigatePublish}
            onSelectProperty={handleSelectProperty}
          />
        )}

        {pageMode === 'account' && user && (
          <AccountPage
            user={user}
            userRole={userRole}
            onRoleChange={(newRole) => setUserRole(newRole)}
            onBack={navigateAccount}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
            onNavigateAgentDashboard={PHASE_TWO_ENABLED ? navigateAgentDashboard : undefined}
            onNavigateAgentApplication={PHASE_THREE_UI_ENABLED ? navigateAgentApplication : undefined}
          />
        )}

        {PHASE_TWO_ENABLED && AgentDashboardPage && pageMode === 'agent-dashboard' && user && (
          <AgentDashboardPage
            user={user}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
            onNavigateAgentDashboard={navigateAgentDashboard}
            onEditProperty={navigateEditProperty}
            onSelectProperty={handleSelectProperty}
          />
        )}

        {PHASE_THREE_UI_ENABLED && AgentApplicationPage && pageMode === 'agent-application' && user && (
          <AgentApplicationPage user={user} onBack={navigateHome} />
        )}

        {PHASE_FOUR_SVC_ENABLED && ServiceDirectoryPage && pageMode === 'services' && (
          <ServiceDirectoryPage onRequireLogin={openLogin} onCreateProfile={navigateServiceSubmission} onManageProfiles={navigateMyServiceProfiles} reviewsEnabled={PHASE_FOUR_REV_ENABLED} userId={user?.id ?? null} />
        )}
        {PHASE_FOUR_SVC_ENABLED && MyServiceProfilesPage && pageMode === 'my-services' && user && (
          <MyServiceProfilesPage onBack={navigateServices} onCreate={navigateServiceSubmission} onEdit={navigateEditServiceProfile} />
        )}
        {PHASE_FOUR_MAT_ENABLED && MaterialsMarketplacePage && pageMode === 'materials' && (
          <MaterialsMarketplacePage onRequireLogin={openLogin} onCreateListing={navigateMaterialSubmission} onManageListings={navigateMyMaterialListings} />
        )}
        {PHASE_FOUR_SVC_ENABLED && ServiceProviderSubmissionPage && pageMode === 'service-submit' && user && (
          <ServiceProviderSubmissionPage onBack={navigateMyServiceProfiles} onRequireLogin={openLogin} profileId={new URLSearchParams(window.location.search).get('edit') || undefined} />
        )}
        {PHASE_FOUR_MAT_ENABLED && MaterialListingSubmissionPage && pageMode === 'material-submit' && user && (
          <MaterialListingSubmissionPage onBack={navigateMyMaterialListings} onRequireLogin={openLogin} listingId={new URLSearchParams(window.location.search).get('edit') || undefined} />
        )}
        {PHASE_FOUR_MAT_ENABLED && MyMaterialListingsPage && pageMode === 'my-materials' && user && (
          <MyMaterialListingsPage onBack={navigateMaterials} onCreate={navigateMaterialSubmission} onEdit={navigateEditMaterialListing} />
        )}
        {PHASE_FOUR_VAL_ENABLED && PropertyValuationPage && pageMode === 'valuation' && (
          <PropertyValuationPage authenticated={Boolean(user)} onRequireLogin={openLogin} />
        )}

        {pageMode === 'favorites' && (
          <FavoritesPage
            properties={properties}
            onNavigateAccount={navigateAccount}
            onNavigateFavorites={navigateFavorites}
            onNavigateMyProperties={navigateMyProperties}
            onNavigateAgentDashboard={PHASE_TWO_ENABLED ? navigateAgentDashboard : undefined}
            onSelectProperty={handleSelectProperty}
            onGoResults={navigateResults}
            onOpenService={navigateServiceDetail}
            onOpenMaterial={navigateMaterialDetail}
            onGoServices={navigateServices}
            onGoMaterials={navigateMaterials}
          />
        )}

        {pageMode === 'auth-callback' && (
          <AuthCallbackPage
            onContinue={(targetPath) => {
              if (targetPath) {
                setPageMode(getInitialPageMode())
                setFilters(getInitialFilters())
                setSelectedPropertyId(getInitialSelectedPropertyId())
                setSeoResultsRoute(parseSeoResultsRoute(window.location.pathname))
                window.scrollTo(0, 0)
              } else {
                navigateHome()
              }
            }}
          />
        )}

        {pageMode === 'reset-password' && (
          <ResetPasswordPage onDone={navigateLoginAfterPasswordReset} />
        )}

        {pageMode === 'moderar' && (
          <AdminPage
            userRole={userRole}
            onNavigateHome={navigateHome}
            onSessionExpired={handleExpiredAdminSession}
          />
        )}

        {pageMode === 'privacy' && (
          <PrivacyPage onBack={navigateHome} />
        )}

        {pageMode === 'terms' && (
          <TermsPage onBack={navigateHome} />
        )}

        {!isRecoveryPage && <SiteFooter />}
      </Suspense>

      <PWAInstallPrompt />

      {!isRecoveryPage && <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
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
          <span>Publicar</span>
        </button>
        <button className={pageMode === 'account' ? 'is-active' : ''} type="button" onClick={navigateAccount}>
          <UserRound size={17} />
          <span>Cuenta</span>
        </button>
      </nav>}

      <Suspense fallback={null}>
        {isSavePromptOpen && <SavePromptModal onClose={closeSavePrompt} />}
        {isLoginOpen && <LoginModal onClose={closeLogin} />}
      </Suspense>
    </main>
  )
}

export function PageLoadingState({ pageMode }: { pageMode?: PageMode }) {
  if (pageMode === 'results') {
    const textStyle: React.CSSProperties = { color: 'transparent', userSelect: 'none' }

    return (
      <section className="results-route-fallback" aria-label="Cargando resultados">
        <div className="results-route-fallback__toolbar" />
        <div className="results-route-fallback__content">
          <div className="results-route-fallback__heading">
            <div>
              <div className="results-route-fallback__line results-route-fallback__line--eyebrow" style={textStyle}>
                Cargando
              </div>
              <div className="results-route-fallback__line results-route-fallback__line--title" style={textStyle}>
                Cargando listado de propiedades
              </div>
            </div>
            <div className="results-route-fallback__pill" style={textStyle}>
              Filtrar
            </div>
          </div>
          <div className="results-route-fallback__line results-route-fallback__line--summary" style={textStyle}>
            Buscando y filtrando los anuncios disponibles en Cuba...
          </div>
          <div className="results-route-fallback__grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="results-route-fallback__card" key={index}>
                <div className="results-route-fallback__photo" />
                <div className="results-route-fallback__info">
                  <div className="results-route-fallback__line results-route-fallback__line--price" style={textStyle}>
                    $0,000
                  </div>
                  <div className="results-route-fallback__line results-route-fallback__line--card-title" style={textStyle}>
                    Cargando titulo del anuncio y ubicacion
                  </div>
                  <div className="results-route-fallback__line results-route-fallback__line--card-meta" style={textStyle}>
                    Cargando especificaciones
                  </div>
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
