import { useCallback, useRef, useState, type ReactNode, type UIEvent } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../../modules/maps/lib/configureMapLibreWorker'
import {
  Bath,
  BedDouble,
  Car,
  MapPin,
  Phone,
  Ruler,
  Share2,
  ChevronLeft,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Eye,
  Building2,
} from 'lucide-react'
import { useEffect } from 'react'
import { createApproximateLocationArea } from '../../modules/maps/lib/approximateLocationArea'
import { approximatePropertyCoordinates } from '../../modules/maps/lib/propertyCoordinates'
import { useSEO } from '../../shared/hooks/useSEO'
import { isAndroidDevice, isIOSDevice } from '../../shared/pwa/installEnvironment'
import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import { normalizePhoneForStorage, validatePhone } from '../../shared/lib/phone'
import { PropertyCard } from '../../modules/properties/components/PropertyCard'
import { ExchangePreferencesSummary } from '../../modules/properties/components/ExchangePreferencesSummary'
import { SavePropertyButton } from '../../modules/properties/components/SavePropertyButton'
import type { OperationType, Property } from '../../modules/properties/types'
import { PUBLIC_PROPERTY_SELECT } from '../../modules/properties/publicPropertySelect'
import {
  getPropertyContactInfo,
} from '../../modules/properties/utils/contact'
import { MarketplaceContactActions } from '../../shared/ui/MarketplaceContactActions'
import { publicPropertyLocation } from '../../shared/lib/propertyLocation'
import {
  getPropertyGalleryImages,
  getPropertyCoverImage,
  normalizePropertyImages,
  PROPERTY_IMAGE_FALLBACK,
} from '../../modules/properties/utils/images'
import { formatPrice } from '../../shared/lib/formatPrice'
import { getOpenFreeMapStyle } from '../../modules/maps/lib/openFreeMapStyle'
import { Button } from '../../shared/ui/button'
import { Card, CardContent } from '../../shared/ui/card'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'
import { TurnstileWidget } from '../../shared/ui/TurnstileWidget'
import { submitPublicContact, submitPublicReport } from './publicSubmissions'
import type { AgentProfile } from '../../modules/agents/types'
import { PHASE_TWO_ENABLED } from '../../shared/config/features'

import type { SearchFilters } from '../../modules/search/types'

const trackContactClickInPhaseTwoDev = import.meta.env.DEV
  ? (propertyId: string, channel: 'phone' | 'whatsapp') =>
      import('../../modules/properties/utils/contactTracking')
        .then((module) => module.trackContactClick(propertyId, channel))
  : null

const fetchAgentProfileInPhaseTwoDev = import.meta.env.DEV
  ? (agentId: string) => import('../../modules/agents/agentRepository')
      .then((module) => module.fetchAgentProfile(agentId))
  : null

type DetailPageProps = {
  property: Property
  onBack: () => void
  filters: SearchFilters
  onChangeFilters: (filters: SearchFilters) => void
  userRole?: string
  onAdminHideProperty?: (propertyId: string) => void
  onAdminDeleteProperty?: (propertyId: string) => void
  onSelectAgent?: (agentId: string) => void
}

function titleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
}

function getNumericFeature(property: Property, key: string): number | null {
  const value = property.features?.[key]
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function DetailPage({
  property,
  onBack,
  filters,
  onChangeFilters,
  userRole,
  onAdminHideProperty,
  onAdminDeleteProperty,
  onSelectAgent,
}: DetailPageProps) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareInProgress = useRef(false)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const [mediaModalTab, setMediaModalTab] = useState<'photos' | 'map'>('photos')
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportTurnstileToken, setReportTurnstileToken] = useState<string | null>(null)
  const [reportTurnstileKey, setReportTurnstileKey] = useState(0)

  const isAdmin = userRole === 'admin'
  const isPublished = property.status === 'published'
  const floorLevel = getNumericFeature(property, 'floorLevel')
  const levels = getNumericFeature(property, 'levels')

  useEffect(() => {
    if (window.location.hash === '#contactar-anunciante') {
      const timeout = window.setTimeout(() => {
        scrollToContact()
      }, 300)
      return () => window.clearTimeout(timeout)
    }
  }, [property.id])

  useEffect(() => {
    if (!property.id) return

    const incrementViews = async () => {
      try {
        const response = await fetch('/api/property-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: property.id }),
        })
        if (!response.ok) {
          logSafeEvent({
            module: 'properties',
            action: 'increment_view_count_failed',
            level: 'warn',
            code: 'DB_ERROR',
          })
        }
      } catch {
        logSafeEvent({
          module: 'properties',
          action: 'increment_view_count_failed',
          level: 'warn',
          code: 'DB_ERROR',
        })
      }
    }
    incrementViews()
  }, [property.id])



  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (reportLoading) return
    setReportLoading(true)
    setReportError(null)

    if (!reportTurnstileToken) {
      setReportError('Por favor, completa la verificación de seguridad.')
      setReportLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      await submitPublicReport({
        turnstileToken: reportTurnstileToken,
        propertyId: property.id,
        reason: reportReason,
        description: reportDescription,
        accessToken: session?.access_token,
      })

      setReportSuccess(true)
      setReportReason('')
      setReportDescription('')
      setReportTurnstileToken(null)
    } catch (err: unknown) {
      logSafeEvent({
        module: 'detail',
        action: 'submit_report',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setReportError('Ocurrió un error al enviar el reporte. Por favor intenta de nuevo.')
      setReportTurnstileToken(null)
      setReportTurnstileKey(prev => prev + 1)
    } finally {
      setReportLoading(false)
    }
  }

  // Dynamic document title and description for this property detail page
  useSEO({
    title: property ? `${property.title} - ${formatPrice(property.priceUsd)}` : 'Cargando Propiedad',
    description: property ? `${property.description.slice(0, 150)}... Contacto en Cubitat.` : undefined,
    image: property?.coverImage || undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    type: 'article'
  })

  const locationParts = publicPropertyLocation(property.location).split(',').map(s => s.trim())
  let province = ''
  let municipality = ''
  let neighborhood = ''
  
  if (locationParts.length >= 4) {
    province = locationParts[3]
    municipality = locationParts[2]
    neighborhood = locationParts[1]
  } else if (locationParts.length === 3) {
    province = locationParts[2]
    municipality = locationParts[1]
    neighborhood = locationParts[0]
  } else if (locationParts.length === 2) {
    province = locationParts[1]
    municipality = locationParts[0]
  } else if (locationParts.length === 1) {
    province = locationParts[0]
  }

  async function copyToClipboardFallback() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err: unknown) {
      logSafeEvent({
        module: 'detail',
        action: 'copy_clipboard',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
    }
  }

  async function handleShare() {
    if (shareInProgress.current) return
    shareInProgress.current = true
    setSharing(true)
    const shareData = {
      title: property.title,
      text: property.description ? (property.description.substring(0, 100) + '...') : 'Anuncio publicado en Cubitat',
      url: window.location.href
    }

    try {
      const canUseNativeShare = Boolean(navigator.share) && (isAndroidDevice() || isIOSDevice())
      if (canUseNativeShare && navigator.share) {
        try {
          await navigator.share(shareData)
        } catch (err: unknown) {
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            await copyToClipboardFallback()
          }
        }
      }
      else await copyToClipboardFallback()
    } finally {
      shareInProgress.current = false
      setSharing(false)
    }
  }

  function scrollToContact() {
    document.getElementById('contactar-anunciante')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="detail-section" id="detalle">
      <div className="detail-shell max-w-7xl mx-auto px-4 py-3 md:py-5">
        
        {/* Navegacion y Acciones Superiores */}
        <div className="detail-heading flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="detail-nav flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onBack}
              className="detail-back inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-700 transition-colors duration-200"
            >
              <ChevronLeft size={16} />
              Regresar a la búsqueda
            </button>
            <div className="detail-breadcrumbs flex flex-wrap items-center gap-1.5 text-sm font-medium text-neutral-500">
              <span className="hover:text-emerald-800 cursor-pointer" onClick={() => {
                onChangeFilters({ query: '', operations: [], propertyType: 'all', zoneId: 'all' })
                onBack()
              }}>
                Inicio
              </span>
              
              {province && (
                <>
                  <span className="text-neutral-300">/</span>
                  <span 
                    className="hover:text-emerald-800 cursor-pointer" 
                    onClick={() => {
                      onChangeFilters({ ...filters, query: province })
                      onBack()
                    }}
                  >
                    {titleCase(province)}
                  </span>
                </>
              )}

              {municipality && (
                <>
                  <span className="text-neutral-300">/</span>
                  <span 
                    className="hover:text-emerald-800 cursor-pointer" 
                    onClick={() => {
                      onChangeFilters({ ...filters, query: `${municipality}, ${province}` })
                      onBack()
                    }}
                  >
                    {titleCase(municipality)}
                  </span>
                </>
              )}

              {neighborhood && (
                <>
                  <span className="text-neutral-300">/</span>
                  <span 
                    className="hover:text-emerald-800 cursor-pointer" 
                    onClick={() => {
                      onChangeFilters({ ...filters, query: `${neighborhood}, ${municipality}` })
                      onBack()
                    }}
                  >
                    {titleCase(neighborhood)}
                  </span>
                </>
              )}

              <span className="text-neutral-300">/</span>
              <span 
                className="hover:text-emerald-800 cursor-pointer" 
                onClick={() => {
                  const ops: OperationType[] = [property.operation]
                  onChangeFilters({ ...filters, operations: ops })
                  onBack()
                }}
              >
                {property.operation === 'alquiler' ? 'Renta' : property.operation === 'venta' ? 'Venta' : 'Permuta'}
              </span>

              <span className="text-neutral-300">/</span>
              <span 
                className="hover:text-emerald-800 cursor-pointer" 
                onClick={() => {
                  onChangeFilters({ ...filters, propertyType: property.propertyType })
                  onBack()
                }}
              >
                {property.propertyType === 'apartamento' ? 'Departamentos' : property.propertyType === 'casa' ? 'Casas' : 'Terrenos'}
              </span>
            </div>
          </div>
          <div className="detail-actions flex items-center gap-2 w-full md:w-auto">
            <SavePropertyButton
              propertyId={property.id}
              iconSize={14}
              showLabel
              labelClassName="detail-action-label"
              className={(saved) => `detail-action-button flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-neutral-200 hover:bg-neutral-50 text-xs font-bold transition-colors duration-200 ${saved ? 'text-red-600 bg-red-50/50 border-red-100 hover:bg-red-50' : 'text-neutral-700'}`}
              iconClassName={(saved) => saved ? 'fill-red-500 text-red-500' : 'text-neutral-500'}
            />
            <Button
              type="button"
              variant="outline"
              aria-label="Compartir propiedad"
              aria-busy={sharing}
              disabled={sharing}
              onClick={handleShare}
              className="detail-action-button flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors duration-200"
            >
              <Share2 size={14} className="text-neutral-500" />
              <span className="detail-action-label">{copied ? 'Copiado' : 'Compartir'}</span>
            </Button>
            {isAdmin && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Ocultar publicación"
                  onClick={() => onAdminHideProperty?.(property.id)}
                  className="detail-action-button flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-amber-200 hover:bg-amber-50 text-xs font-bold text-amber-700 transition-colors duration-200"
                >
                  <AlertTriangle size={14} />
                  <span className="detail-action-label">Ocultar</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Eliminar publicación"
                  onClick={() => onAdminDeleteProperty?.(property.id)}
                  className="detail-action-button flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-red-200 hover:bg-red-50 text-xs font-bold text-red-700 transition-colors duration-200"
                >
                  <X size={14} />
                  <span className="detail-action-label">Eliminar</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="detail-desktop-hero">
          <div className="detail-desktop-hero-copy">
            <div className="detail-badges flex items-center gap-2 mb-4">
              <span className="text-[10px] tracking-wider uppercase font-bold bg-white text-neutral-700 px-2.5 py-1 rounded">
                {titleCase(property.propertyType)}
              </span>
              <span className="text-[10px] tracking-wider uppercase font-bold bg-[#035f53]/10 text-[#035f53] px-2.5 py-1 rounded">
                {titleCase(property.operation)}
              </span>
              {property.view_count !== undefined && (
                <span className="text-[10px] tracking-wider uppercase font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded flex items-center gap-1">
                  <Eye size={12} className="text-neutral-400" />
                  <span>{property.view_count} visitas</span>
                </span>
              )}
            </div>
            <h1 className="detail-desktop-title">
              {property.title}
            </h1>
            <p className="detail-desktop-location">
              <MapPin size={18} />
              <span>{publicPropertyLocation(property.location)}</span>
              <button
                type="button"
                onClick={() => {
                  setMediaModalTab('map')
                  setIsMediaModalOpen(true)
                }}
              >
                Ver ubicación
              </button>
            </p>
            <div className="detail-desktop-price-card">
              <span>{property.operation === 'alquiler' ? 'Alquiler' : property.operation === 'venta' ? 'Precio' : 'Operación'}</span>
              <strong>
                {property.operation === 'permuta'
                  ? 'Permuta'
                  : formatPrice(property.priceUsd)}
              </strong>
              {property.ageYears ? <small>Antigüedad: {property.ageYears} años</small> : null}
            </div>
            {isPublished && (
              <MarketplaceContactActions
                listingType="property"
                listingId={property.id}
                listingTitle={property.title}
                listingLocation={publicPropertyLocation(property.location) ?? ''}
                layout="property-hero"
                onMissing={scrollToContact}
                onChannelOpen={(channel) => {
                  if (PHASE_TWO_ENABLED && trackContactClickInPhaseTwoDev) {
                    void trackContactClickInPhaseTwoDev(property.id, channel)
                  }
                }}
              />
            )}
          </div>
          <div className="detail-desktop-media">
            <ImageGallery
              property={property}
              isOpenModal={isMediaModalOpen}
              setIsOpenModal={setIsMediaModalOpen}
              activeTab={mediaModalTab}
              setActiveTab={setMediaModalTab}
            />
            <div className="detail-desktop-media-actions">
              <button
                type="button"
                onClick={() => {
                  setMediaModalTab('photos')
                  setIsMediaModalOpen(true)
                }}
              >
                Fotos
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaModalTab('map')
                  setIsMediaModalOpen(true)
                }}
              >
                Mapa
              </button>
            </div>
          </div>
        </div>

        {/* Estructura Principal en 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Informacion de Inmueble (Col-span 2) */}
          <div className="detail-main-column lg:col-span-2 space-y-6">
            
            {/* Cabecera del Inmueble */}
            <div className="detail-hero-copy flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="detail-badges flex items-center gap-2 mb-2">
                  <span className="text-[10px] tracking-wider uppercase font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded">
                    {titleCase(property.propertyType)}
                  </span>
                  <span className="text-[10px] tracking-wider uppercase font-bold bg-[#035f53]/10 text-[#035f53] px-2.5 py-1 rounded">
                    {titleCase(property.operation)}
                  </span>
                </div>
                <h1 className="detail-title text-2xl md:text-3xl font-extrabold text-neutral-900 leading-tight mb-2">
                  {property.title}
                </h1>
                
                <div className="detail-meta flex items-center gap-3 mb-3 text-xs font-bold text-neutral-600">
                  {property.ageYears && (
                    <span>Antigüedad: {property.ageYears} años</span>
                  )}
                </div>

                <p className="detail-location-line flex items-center gap-2 text-sm text-neutral-500">
                  <MapPin size={16} className="text-[#035f53] shrink-0" />
                  <span>{publicPropertyLocation(property.location)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaModalTab('map')
                      setIsMediaModalOpen(true)
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-700 underline cursor-pointer ml-1.5 focus:outline-none"
                  >
                    Ver ubicación
                  </button>
                </p>
              </div>

              <div className="detail-price-wrapper md:text-right shrink-0">
                <p className="detail-price-line text-3xl font-black text-[#035f53]">
                  {property.operation === 'permuta'
                    ? 'Permuta'
                    : formatPrice(property.priceUsd)}
                </p>
              </div>
            </div>

            {/* Media Viewer Container */}
            <div className="media-viewer-container">
              <div className="detail-mobile-media-overlay" aria-label="Acciones de la propiedad">
                <div className="detail-mobile-media-topbar">
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onBack()
                    }}
                    aria-label="Regresar a la búsqueda"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div>
                    <button
                    type="button"
                    aria-label="Compartir propiedad"
                    aria-busy={sharing}
                    disabled={sharing}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                        handleShare()
                      }}
                    >
                      <Share2 size={18} />
                    </button>
                    <SavePropertyButton
                      propertyId={property.id}
                      iconSize={18}
                      iconClassName={(saved) => saved ? 'fill-red-500 text-red-500' : ''}
                      preventDefault
                      stopPropagation
                    />
                  </div>
                </div>
                <h1>{property.title}</h1>
                {property.view_count !== undefined && (
                  <p className="detail-mobile-views flex items-center gap-1 text-[11px] text-neutral-500 font-bold mb-3 mt-1.5">
                    <Eye size={12} className="text-neutral-400" />
                    <span>{property.view_count} visitas</span>
                  </p>
                )}
                <div className="detail-mobile-media-pills">
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setMediaModalTab('photos')
                      setIsMediaModalOpen(true)
                    }}
                  >
                    Fotos
                  </button>
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setMediaModalTab('map')
                      setIsMediaModalOpen(true)
                    }}
                  >
                    Mapa
                  </button>
                </div>
              </div>
              <ImageGallery 
                property={property} 
                isOpenModal={isMediaModalOpen}
                setIsOpenModal={setIsMediaModalOpen}
                activeTab={mediaModalTab}
                setActiveTab={setMediaModalTab}
              />
            </div>

            {/* Ficha Técnica / Especificaciones */}
            <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">
                Características básicas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Feature icon={<BedDouble size={20} className="text-[#035f53]" />} label="Recámaras" value={Math.floor(property.bedrooms)} />
                <Feature icon={<Bath size={20} className="text-[#035f53]" />} label="Baños" value={Math.floor(property.bathrooms)} />
                <Feature icon={<Car size={20} className="text-[#035f53]" />} label="Estacionamientos" value={property.parking} />
                <Feature icon={<Ruler size={20} className="text-[#035f53]" />} label="Área total" value={`${property.areaM2} m²`} />
                {property.propertyType === 'apartamento' && floorLevel !== null && floorLevel > 0 && (
                  <Feature icon={<Building2 size={20} className="text-[#035f53]" />} label="Piso / nivel" value={Math.floor(floorLevel)} />
                )}
                {property.propertyType !== 'apartamento' && levels !== null && levels > 1 && (
                  <Feature icon={<Building2 size={20} className="text-[#035f53]" />} label="Niveles" value={Math.floor(levels)} />
                )}
              </div>
            </div>

            {property.operation === 'permuta' && (
              <ExchangePreferencesSummary features={property.features} />
            )}

            {/* Descripción */}
            <Card className="border border-neutral-100 rounded-xl shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
                  Descripción
                </h2>
                <p className="text-neutral-600 text-sm md:text-base leading-relaxed whitespace-pre-line max-w-3xl">
                  {property.description}
                </p>
              </CardContent>
            </Card>

            {/* Amenidades */}
            {property.amenities && property.amenities.length > 0 && (
              <Card className="border border-neutral-100 rounded-xl shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">
                    Amenidades y Servicios
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-sm text-neutral-600">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Banner: Reportar propiedad sospechosa */}
            {isPublished && <div className="bg-[#fdfaf2] border border-[#f5ebdb] rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-800">
                  Reporta una propiedad sospechosa
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  Si hay algo inusual en la propiedad, infórmanos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#fcead0] hover:bg-[#ebd5b8] text-xs font-bold text-neutral-700 transition-all duration-200 border-none cursor-pointer focus:outline-none shrink-0"
              >
                <AlertTriangle size={14} className="text-amber-600" />
                Informar sobre un problema
              </button>
            </div>}

            {/* Ubicación y Seguridad */}
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="p-3 bg-emerald-100 rounded-full text-emerald-800 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-800">Ubicación aproximada protegida</h2>
                  <p className="text-xs text-neutral-600 leading-normal mt-0.5">
                  Por seguridad y privacidad del propietario, no mostramos la ubicación exacta. Al contactar al anunciante recibirás la información precisa y agendarás una visita controlada.
                </p>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Tarjeta de Contacto (Sticky) */}
          <div className="space-y-6">
            {isPublished ? (
              <ContactCard property={property} onReport={() => setIsReportModalOpen(true)} onSelectAgent={onSelectAgent} />
            ) : (
              <Card id="contactar-anunciante" className="border border-amber-200 rounded-xl shadow-sm p-6 bg-amber-50">
                <CardContent className="p-0 space-y-2">
                  <h2 className="text-base font-bold text-neutral-900">Contacto aún no disponible</h2>
                  <p className="text-sm leading-relaxed text-neutral-700">
                    El contacto estará disponible cuando el anuncio sea publicado.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>



      {/* Propiedades Similares */}
      <div className="detail-similar-section max-w-7xl mx-auto px-4 pb-12 mt-8">
        <SimilarProperties currentProperty={property} />
      </div>

      {isPublished && <div className="mobile-detail-cta" aria-label="Acciones de contacto">
        <MarketplaceContactActions
          listingType="property"
          listingId={property.id}
          listingTitle={property.title}
          listingLocation={publicPropertyLocation(property.location) ?? ''}
          layout="property-mobile"
          onMissing={scrollToContact}
          onChannelOpen={(channel) => {
            if (PHASE_TWO_ENABLED && trackContactClickInPhaseTwoDev) {
              void trackContactClickInPhaseTwoDev(property.id, channel)
            }
          }}
        />
      </div>}

      {isPublished && isReportModalOpen && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setIsReportModalOpen(false) }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 focus:outline-none"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              Informar sobre un problema
            </h3>

            {reportSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800">¡Reporte enviado con éxito!</h4>
                  <p className="text-xs text-neutral-600 mt-1">
                    Agradecemos tu ayuda para mantener seguro nuestro portal. Un moderador revisará los detalles a la brevedad.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setIsReportModalOpen(false)
                    setReportSuccess(false)
                  }}
                  className="w-full bg-[#035f53] hover:bg-[#024a41] text-white rounded-full mt-2"
                >
                  Cerrar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="property-report-reason" className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Motivo del reporte
                  </label>
                  <select
                    id="property-report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="">Selecciona un motivo</option>
                    <option value="FRAUD">Fraude o estafa</option>
                    <option value="INCORRECT_INFO">Información falsa o desactualizada</option>
                    <option value="SPAM">Publicidad o duplicado (Spam)</option>
                    <option value="OTHER">Otro motivo</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="property-report-description" className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Detalles adicionales
                  </label>
                  <Textarea
                    id="property-report-description"
                    placeholder="Explica brevemente por qué consideras que esta propiedad tiene un problema..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="min-h-[80px] text-xs"
                    required
                  />
                </div>

                <TurnstileWidget
                  key={reportTurnstileKey}
                  action="report-property"
                  onVerify={(token) => setReportTurnstileToken(token)}
                  onExpire={() => setReportTurnstileToken(null)}
                  onError={() => setReportTurnstileToken(null)}
                />

                {reportError && (
                  <p className="text-xs text-red-600 font-semibold">{reportError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 rounded-full h-10 text-xs font-bold"
                    disabled={reportLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-10 text-xs font-bold"
                    disabled={reportLoading}
                  >
                    {reportLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      'Enviar reporte'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </section>
  )
}

function ImageGallery({
  property,
  isOpenModal,
  setIsOpenModal,
  activeTab,
  setActiveTab,
  renderModal = true,
}: {
  property: Property
  isOpenModal: boolean
  setIsOpenModal: (open: boolean) => void
  activeTab: 'photos' | 'map'
  setActiveTab: (tab: 'photos' | 'map') => void
  renderModal?: boolean
}) {
  const [activeImage, setActiveImage] = useState<string>(property.coverImage || '')
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const images = getPropertyGalleryImages(property.coverImage, property.images)

  function handleCarouselScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollLeft, clientWidth } = event.currentTarget
    setActiveIndex(Math.round(scrollLeft / clientWidth))
  }

  function goToSlide(index: number) {
    const carousel = carouselRef.current
    if (!carousel) return

    carousel.scrollTo({ left: index * carousel.clientWidth, behavior: 'smooth' })
  }

  return (
      <div className="detail-gallery space-y-4">
        {/* Grid de collage premium para pantallas grandes, fallback a slider en movil */}
      <div className={`hidden md:grid grid-cols-4 grid-rows-2 gap-3 aspect-[21/9] rounded-2xl overflow-hidden shadow-md border border-neutral-100 ${images.length < 3 ? 'detail-gallery-grid--single' : ''}`}>
        
        {/* Foto principal grande */}
        <div 
          onClick={() => { setActiveImage(images[0]); setActiveTab('photos'); setIsOpenModal(true); }}
          className="col-span-2 row-span-2 bg-cover bg-center cursor-pointer hover:opacity-95 transition-opacity relative group"
          style={{ backgroundImage: `url("${images[0]}")`, backgroundColor: property.coverTone || '#f3f4f6' }}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
        </div>

        {/* Fotos laterales */}
        {images.slice(1, 5).map((img, idx) => (
          <div 
            key={idx}
            onClick={() => { setActiveImage(img); setActiveTab('photos'); setIsOpenModal(true); }}
            className="bg-cover bg-center cursor-pointer hover:opacity-95 transition-opacity relative group"
            style={{ backgroundImage: `url("${img}")`, backgroundColor: property.coverTone || '#f3f4f6' }}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            {idx === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-black">
                +{images.length - 4} fotos
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Slider movil */}
      <div className="mobile-detail-gallery block md:hidden space-y-2">
        <div
          ref={carouselRef}
          className="mobile-detail-gallery-track"
          onScroll={handleCarouselScroll}
        >
          {images.map((img, idx) => (
            <button
              key={img}
              type="button"
              className="mobile-detail-gallery-slide"
              onClick={() => {
                setActiveImage(img)
                setActiveIndex(idx)
                setActiveTab('photos')
                setIsOpenModal(true)
              }}
              aria-label={`Abrir foto ${idx + 1} de ${images.length}`}
            >
              <img
                src={img}
                alt={`Foto ${idx + 1} de la propiedad`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                onError={(event) => {
                  event.currentTarget.src = PROPERTY_IMAGE_FALLBACK
                }}
              />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="mobile-detail-gallery-dots" aria-label="Fotos de la propiedad">
            {images.map((img, idx) => (
              <button
                key={img}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`mobile-detail-gallery-dot ${
                  activeIndex === idx ? 'is-active' : ''
                }`}
                aria-label={`Ver foto ${idx + 1}`}
                aria-current={activeIndex === idx ? 'true' : undefined}
              >
                <span />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal visor de pantalla completa */}
      {renderModal && isOpenModal && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpenModal(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsOpenModal(false) }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <button 
            onClick={() => setIsOpenModal(false)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10"
            aria-label="Cerrar galeria"
          >
            <X size={22} />
          </button>
          
          {/* Modal Header Tabs: Fotos / Mapa */}
          <div className="flex gap-2 mb-6 bg-white/10 p-1 rounded-full w-fit">
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer ${
                activeTab === 'photos' ? 'bg-white text-neutral-900 shadow' : 'bg-transparent text-white hover:text-neutral-200'
              }`}
            >
              Fotos
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer ${
                activeTab === 'map' ? 'bg-white text-neutral-900 shadow' : 'bg-transparent text-white hover:text-neutral-200'
              }`}
            >
              Mapa
            </button>
          </div>
          
          {activeTab === 'photos' ? (
            <>
              <img 
                src={activeImage} 
                alt="Detalle de propiedad" 
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl animate-scaleUp"
                onError={(event) => {
                  event.currentTarget.src = PROPERTY_IMAGE_FALLBACK
                }}
              />

              <div className="flex gap-2 mt-6 overflow-x-auto max-w-full py-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 aspect-[4/3] rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activeImage === img ? 'border-emerald-500 scale-95 shadow' : 'border-transparent opacity-50'
                    }`}
                  >
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${img}")` }} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="w-full max-w-4xl h-[50vh] md:h-[65vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-scaleUp">
              <DetailLocationMap
                latitude={property.coordinates.latitude}
                longitude={property.coordinates.longitude}
                location={publicPropertyLocation(property.location)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailLocationMap({ latitude, longitude, location }: { latitude: number; longitude: number; location: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const coordinates = approximatePropertyCoordinates({ latitude, longitude }, location)
  const approximateLatitude = coordinates?.latitude
  const approximateLongitude = coordinates?.longitude

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    if (approximateLatitude == null || approximateLongitude == null) {
      setMapLoading(false)
      setMapUnavailable(true)
      return
    }

    const abortController = new AbortController()
    let loadFailed = false
    let didLoad = false
    const center: [number, number] = [approximateLongitude, approximateLatitude]
    setMapLoading(true)
    setMapUnavailable(false)
    const loadTimeout = window.setTimeout(() => {
      failMap(new Error('El mapa no respondió antes del tiempo límite'))
    }, 15_000)

    function failMap(error: unknown) {
      if (abortController.signal.aborted || loadFailed) return
      loadFailed = true
      window.clearTimeout(loadTimeout)
      setMapLoading(false)
      setMapUnavailable(true)
      mapRef.current?.remove()
      mapRef.current = null
      logSafeEvent({
        module: 'maps',
        action: 'init_detail_map',
        level: 'error',
        code: sanitizeErrorReason(error),
      })
    }

    async function initMap() {
      if (!containerRef.current || mapRef.current) return

      try {
        const style = await getOpenFreeMapStyle(abortController.signal)
        if (abortController.signal.aborted) return

        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center,
          zoom: 12,
          attributionControl: false,
        })
        mapRef.current = map

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right',
        )
        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          'bottom-right',
        )

        map.once('load', () => {
          if (abortController.signal.aborted || loadFailed || mapRef.current !== map) return
          try {
            didLoad = true
            window.clearTimeout(loadTimeout)
            map.addSource('approximate-property-location', {
              type: 'geojson',
              data: createApproximateLocationArea(center),
            })
            map.addLayer({
              id: 'approximate-property-location-area',
              type: 'fill',
              source: 'approximate-property-location',
              paint: {
                'fill-color': '#059669',
                'fill-opacity': 0.2,
              },
            })
            map.addLayer({
              id: 'approximate-property-location-outline',
              type: 'line',
              source: 'approximate-property-location',
              paint: {
                'line-color': '#047857',
                'line-width': 2,
                'line-opacity': 0.75,
              },
            })
            setMapLoading(false)
            setMapUnavailable(false)
          } catch (error) {
            failMap(error)
          }
        })

        map.on('error', (event) => {
          if (!didLoad) failMap(event.error ?? new Error('No se pudieron cargar los recursos del mapa'))
        })
      } catch (error) {
        failMap(error)
      }
    }

    void initMap()

    return () => {
      abortController.abort()
      window.clearTimeout(loadTimeout)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [approximateLatitude, approximateLongitude, retryCount])

  return (
    <div className="relative h-full w-full bg-neutral-100">
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Mapa de ubicación aproximada de la propiedad"
      />
      {mapLoading && !mapUnavailable && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-100/95">
          <Loader2 className="h-6 w-6 animate-spin text-[#035f53]" aria-hidden="true" />
          <p className="text-sm text-neutral-600">Cargando mapa…</p>
        </div>
      )}
      {mapUnavailable && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-100/95 p-6 text-center">
          <p className="max-w-sm text-sm text-neutral-700">
            No se pudo cargar el mapa. La ficha y sus datos siguen disponibles; puedes intentarlo de nuevo.
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#035f53] text-[#035f53]"
            onClick={() => {
              setMapUnavailable(false)
              setMapLoading(true)
              setRetryCount(count => count + 1)
            }}
          >
            Reintentar mapa
          </Button>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 max-w-sm rounded-lg bg-white/95 p-3 text-left shadow-lg">
        <strong className="block text-sm text-neutral-900">Ubicación aproximada</strong>
        <span className="block text-xs leading-relaxed text-neutral-600">
          El marcador no representa la dirección exacta de la propiedad.
        </span>
      </div>
    </div>
  )
}

/* Subcomponente: Tarjeta de Contacto */
function ContactCard({
  property,
  onReport,
  onSelectAgent,
}: {
  property: Property
  onReport: () => void
  onSelectAgent?: (agentId: string) => void
}) {
  const contactCooldownKey = `cubitat_contact_sent_${property.id}`
  const getCooldownRemainingMs = useCallback(() => {
    try {
      const saved = localStorage.getItem(contactCooldownKey)
      if (!saved) return 0
      const elapsed = Date.now() - Number(saved)
      return Number.isFinite(elapsed) && elapsed >= 0 ? Math.max(0, 300000 - elapsed) : 0
    } catch {
      return 0
    }
  }, [contactCooldownKey])
  const [contactSent, setContactSent] = useState(false)
  const [contactCooldownActive, setContactCooldownActive] = useState(() => getCooldownRemainingMs() > 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactTurnstileToken, setContactTurnstileToken] = useState<string | null>(null)
  const [contactTurnstileKey, setContactTurnstileKey] = useState(0)
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null)

  useEffect(() => {
    if (!contactCooldownActive) return
    const timeout = window.setTimeout(() => setContactCooldownActive(false), getCooldownRemainingMs())
    return () => window.clearTimeout(timeout)
  }, [contactCooldownActive, getCooldownRemainingMs])

  useEffect(() => {
    let active = true
    setAgentProfile(null)
    if (!PHASE_TWO_ENABLED || !fetchAgentProfileInPhaseTwoDev || !property.user_id) {
      return () => {
        active = false
      }
    }

    fetchAgentProfileInPhaseTwoDev(property.user_id)
      .then((profile) => {
        if (active) setAgentProfile(profile)
      })
      .catch(() => {
        if (active) setAgentProfile(null)
      })

    return () => {
      active = false
    }
  }, [property.user_id])

  async function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    // React no garantiza que currentTarget siga disponible después de un await.
    // Capturamos los valores enviados antes de verificar Turnstile.
    const formData = new FormData(e.currentTarget)
    const name = formData.get('contact-name') as string
    const phone = formData.get('contact-phone') as string
    const message = formData.get('contact-message') as string

    setLoading(true)
    setError(null)

    if (!validatePhone(phone)) {
      setError('Escribe un teléfono válido de 7 a 15 dígitos.')
      setLoading(false)
      return
    }

    // Verificar spam en local storage antes de enviar
    const saved = localStorage.getItem(`cubitat_contact_sent_${property.id}`)
    if (saved) {
      const diff = Date.now() - Number(saved)
      if (diff < 300000) {
        const remaining = Math.ceil((300000 - diff) / 1000)
        setError(`Has enviado un mensaje recientemente. Espera ${remaining} segundos.`)
        setLoading(false)
        return
      }
    }

    if (!contactTurnstileToken) {
      setError('Por favor, completa la verificación de seguridad.')
      setLoading(false)
      return
    }

    try {
      await submitPublicContact({
        turnstileToken: contactTurnstileToken,
        propertyId: property.id,
        contactName: name,
        contactPhone: normalizePhoneForStorage(phone),
        message,
      })

      localStorage.setItem(`cubitat_contact_sent_${property.id}`, Date.now().toString())
      setContactSent(true)
    } catch (err: unknown) {
      logSafeEvent({
        module: 'detail',
        action: 'submit_contact_lead',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      const serverMessage = err instanceof Error ? err.message : ''
      setError(serverMessage || 'Ocurrió un error al enviar el mensaje. Por favor intenta de nuevo.')
      setContactTurnstileToken(null)
      setContactTurnstileKey(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card id="contactar-anunciante" className="border border-neutral-100 rounded-2xl shadow-xl p-6 sticky top-6 bg-white">
      <CardContent className="p-0 space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-bold text-neutral-900">
              Contactar anunciante
            </h2>
          </div>
          <p className="text-[11px] text-neutral-500 flex items-center gap-1">
            <Calendar size={12} />
            Publicado recientemente
          </p>

          {PHASE_TWO_ENABLED && property.user_id && agentProfile && onSelectAgent && (
            <button
              type="button"
              onClick={() => onSelectAgent(property.user_id!)}
              className="w-full mt-3 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-[#035f53] font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-teal-200/60 transition-colors cursor-pointer"
            >
              <Building2 size={14} />
              <span>Ver perfil del agente / anunciante</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-xs leading-relaxed flex items-center gap-2">
            <AlertTriangle className="shrink-0 text-red-500" size={16} />
            <span>{error}</span>
          </div>
        )}

        {contactSent ? (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs leading-relaxed">
            <strong>¡Mensaje enviado!</strong> Tu solicitud ha sido procesada. El anunciante se pondrá en contacto contigo pronto.
          </div>
        ) : contactCooldownActive ? (
          <div role="status" className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-100 text-xs leading-relaxed">
            Ya enviaste una consulta a esta publicación recientemente desde este navegador. Podrás intentarlo de nuevo cuando termine el periodo de espera.
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="contact-message" className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Tu mensaje
              </label>
              <Textarea
                id="contact-message"
                name="contact-message"
                required
                disabled={loading}
                defaultValue={`Hola, estoy interesado en "${property.title}" en ${publicPropertyLocation(property.location)}. Quisiera recibir más detalles.`}
                className="min-h-[100px] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-name" className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Nombre completo
              </label>
              <Input 
                id="contact-name" 
                name="contact-name" 
                required 
                disabled={loading}
                placeholder="Escribe tu nombre" 
                className="text-xs" 
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-phone" className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Teléfono o WhatsApp
              </label>
              <Input 
                id="contact-phone" 
                name="contact-phone" 
                required 
                type="tel" 
                disabled={loading}
                placeholder="+53 50000000" 
                inputMode="tel"
                autoComplete="tel"
                aria-describedby="contact-phone-help"
                className="text-xs" 
              />
              <p id="contact-phone-help" className="text-[11px] text-neutral-500">
                Acepta números de cualquier país, con 7 a 15 dígitos.
              </p>
            </div>

            <TurnstileWidget
              key={contactTurnstileKey}
              action="contact-owner"
              onVerify={(token) => setContactTurnstileToken(token)}
              onExpire={() => setContactTurnstileToken(null)}
              onError={() => setContactTurnstileToken(null)}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 text-xs font-bold flex items-center justify-center gap-2 mt-4 transition-colors duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Enviando mensaje...
                </>
              ) : (
                <>
                  <Phone size={14} />
                  Enviar mensaje y ver contacto
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <div className="border-t border-neutral-100 mt-5 pt-4 text-center">
        <button 
          type="button" 
          onClick={onReport}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-600 hover:text-red-500 transition-colors cursor-pointer border-none bg-transparent"
        >
          <AlertTriangle size={14} />
          Reportar propiedad sospechosa
        </button>
      </div>
    </Card>
  )
}

/* Subcomponente Auxiliar: Especificacion */
function Feature({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center p-3.5 bg-neutral-50 rounded-lg text-center border border-neutral-100/50">
      <div className="mb-2">{icon}</div>
      <strong className="text-sm font-extrabold text-neutral-800 leading-tight">
        {value}
      </strong>
      <span className="text-[10px] font-semibold text-neutral-600 mt-0.5">
        {label}
      </span>
    </div>
  )
}

/* Subcomponente: Propiedades Similares */
function SimilarProperties({ currentProperty }: { currentProperty: Property }) {
  const [similar, setSimilar] = useState<Property[]>([])
  
  const locationParts = currentProperty.location ? currentProperty.location.split(',').map(s => s.trim()) : []
  const province = locationParts.length >= 4 ? locationParts[3] : (locationParts.length === 3 ? locationParts[2] : (locationParts.length === 2 ? locationParts[1] : ''))

  useEffect(() => {
    async function fetchSimilar() {
      let query = supabase
        .from('properties')
        .select(PUBLIC_PROPERTY_SELECT)
        .eq('property_type', currentProperty.propertyType)
        .eq('operation', currentProperty.operation)
        .eq('status', 'published')
        .neq('id', currentProperty.id)

      if (province) {
        query = query.ilike('location', `%${province}%`)
      }

      let { data } = await query.limit(3)
      
      if (data && data.length < 3) {
        const excludeIds = [currentProperty.id, ...data.map((item: any) => item.id)]
        const { data: fallbackData } = await supabase
          .from('properties')
          .select(PUBLIC_PROPERTY_SELECT)
          .eq('property_type', currentProperty.propertyType)
          .eq('operation', currentProperty.operation)
          .eq('status', 'published')
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .limit(3 - data.length)
          
        if (fallbackData) {
          data = [...data, ...fallbackData]
        }
      }
        
      if (data) {
        const mapped = data.map((item: any) => ({
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
            coverImage: getPropertyCoverImage(item.cover_image),
            images: normalizePropertyImages(item.images),
            mapPoint: { x: 300, y: 200 },
            coordinates: item.coordinates || { latitude: 23.1136, longitude: -82.3666 },
            contact_info: getPropertyContactInfo(item.id, undefined),
        }))
        setSimilar(mapped)
      }
    }
    fetchSimilar()
  }, [currentProperty.id, currentProperty.operation, currentProperty.propertyType, province])
  
  if (similar.length === 0) return null
  
  return (
    <div className="mt-12 border-t border-neutral-200 pt-10">
      <h3 className="text-xl font-bold text-neutral-900 mb-6">
        Más {currentProperty.propertyType === 'apartamento' ? 'departamentos' : currentProperty.propertyType === 'casa' ? 'casas' : 'terrenos'} en {currentProperty.operation === 'alquiler' ? 'renta' : currentProperty.operation === 'venta' ? 'venta' : 'permuta'} {province ? `en ${province}` : ''}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {similar.map(prop => (
          <PropertyCard 
            key={prop.id} 
            property={prop} 
            isSelected={false}
            onSelect={() => {
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
              const slug = `${typeStr}-en-${opStr}-en-${cleanLoc}-${prop.id}`
              window.history.pushState(null, '', `/propiedad/${slug}`)
              window.dispatchEvent(new Event('popstate'))
            }} 
          />
        ))}
      </div>
    </div>
  )
}

