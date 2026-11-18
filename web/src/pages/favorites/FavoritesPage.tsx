import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Boxes, MapPin } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { PropertyCard } from '../../modules/properties/components/PropertyCard'
import { PropertyCardSkeleton } from '../../modules/properties/components/PropertyCardSkeleton'
import { useSavedProperties } from '../../modules/properties/hooks/useSavedProperties'
import type { Property } from '../../modules/properties/types'
import { useSavedMarketplaceListings } from '../../modules/marketplace/hooks/useSavedMarketplaceListings'
import { fetchHomeServiceProvidersByIds } from '../../modules/home-services/homeServiceRepository'
import type { HomeServiceProvider } from '../../modules/home-services/types'
import { fetchMaterialListingsByIds } from '../../modules/materials/materialRepository'
import type { MaterialListing } from '../../modules/materials/types'
import { HOME_SERVICE_CATEGORY_LABELS } from '../../modules/home-services/types'
import { MATERIAL_CATEGORY_LABELS } from '../../modules/materials/types'
import { MarketplaceCardImage } from '../../shared/ui/MarketplaceCardImage'
import { SaveMarketplaceListingButton } from '../../shared/ui/SaveMarketplaceListingButton'
import { PHASE_FOUR_MAT_ENABLED, PHASE_FOUR_SVC_ENABLED } from '../../shared/config/features'
import { AccountLayout } from '../account/AccountLayout'
import { useSEO } from '../../shared/hooks/useSEO'

type FavoritesPageProps = {
  properties: Property[]
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateAgentDashboard?: () => void
  onSelectProperty: (propertyId: string) => void
  onGoResults: () => void
  onOpenService: (slug: string) => void
  onOpenMaterial: (slug: string) => void
  onGoServices: () => void
  onGoMaterials: () => void
}

type FavoriteFilter = 'all' | 'properties' | 'services' | 'materials'

export function FavoritesPage({
  properties,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateAgentDashboard,
  onSelectProperty,
  onGoResults,
  onOpenService,
  onOpenMaterial,
  onGoServices,
  onGoMaterials,
}: FavoritesPageProps) {
  const marketplaceFavoritesEnabled = PHASE_FOUR_SVC_ENABLED || PHASE_FOUR_MAT_ENABLED
  useSEO({
    title: 'Mis Favoritos',
  })

  const {
    savedPropertyIds,
    loading,
    error: savedPropertiesError,
    retryLoad: retrySavedProperties,
  } = useSavedProperties()
  const {
    savedServiceIds,
    savedMaterialIds,
    loading: marketplaceLoading,
    error: savedListingsError,
    retryLoad: retrySavedListings,
  } = useSavedMarketplaceListings()
  const [savedServices, setSavedServices] = useState<HomeServiceProvider[]>([])
  const [savedMaterials, setSavedMaterials] = useState<MaterialListing[]>([])
  const [marketplaceError, setMarketplaceError] = useState(false)
  const [marketplaceItemsLoading, setMarketplaceItemsLoading] = useState(marketplaceFavoritesEnabled)
  const [marketplaceItemsRetry, setMarketplaceItemsRetry] = useState(0)
  const [activeFilter, setActiveFilter] = useState<FavoriteFilter>('all')
  const favoriteProperties = properties.filter((property) =>
    savedPropertyIds.has(property.id),
  )
  useEffect(() => {
    let active = true
    async function loadMarketplaceFavorites() {
      setMarketplaceItemsLoading(true)
      setMarketplaceError(false)
      setSavedServices([])
      setSavedMaterials([])
      try {
        const [services, materials] = await Promise.all([
          fetchHomeServiceProvidersByIds([...savedServiceIds]),
          fetchMaterialListingsByIds([...savedMaterialIds]),
        ])
        if (!active) return
        setSavedServices(services)
        setSavedMaterials(materials)
      } catch {
        if (!active) return
        setMarketplaceError(true)
      } finally {
        if (active) setMarketplaceItemsLoading(false)
      }
    }
    if (!marketplaceLoading) void loadMarketplaceFavorites()
    return () => { active = false }
  }, [marketplaceItemsRetry, marketplaceLoading, savedMaterialIds, savedServiceIds])

  function retryMarketplaceFavorites() {
    retrySavedListings()
    setMarketplaceItemsRetry((value) => value + 1)
  }

  function retryAllFavorites() {
    retrySavedProperties()
    retryMarketplaceFavorites()
  }

  const totalFavorites = favoriteProperties.length + savedServices.length + savedMaterials.length
  const visibleProperties = activeFilter === 'all' || activeFilter === 'properties' ? favoriteProperties : []
  const visibleServices = activeFilter === 'all' || activeFilter === 'services' ? savedServices : []
  const visibleMaterials = activeFilter === 'all' || activeFilter === 'materials' ? savedMaterials : []
  const visibleFavoriteCount = visibleProperties.length + visibleServices.length + visibleMaterials.length
  const visibleCountLabel = activeFilter === 'all'
    ? (visibleFavoriteCount === 1 ? 'anuncio guardado' : 'anuncios guardados')
    : ({
        properties: visibleFavoriteCount === 1 ? 'propiedad guardada' : 'propiedades guardadas',
        services: visibleFavoriteCount === 1 ? 'servicio guardado' : 'servicios guardados',
        materials: visibleFavoriteCount === 1 ? 'material guardado' : 'materiales guardados',
        all: '',
      } as const)[activeFilter]

  return (
    <AccountLayout
      active="favorites"
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateAgentDashboard={onNavigateAgentDashboard}
    >
      <section className="relative overflow-hidden rounded-md bg-gradient-to-r from-[#155b55] to-[#007565] px-7 py-8 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
          Guardados
        </p>
        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight mt-2">
          Favoritos
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base font-semibold text-white/85">
          {marketplaceFavoritesEnabled ? 'Revisa las propiedades, servicios y materiales que guardaste.' : 'Revisa las propiedades que guardaste para compararlas con calma.'}
        </p>
      </section>

      <div className="mt-8">
        <div className="catalog-container bg-white rounded-xl border border-neutral-100 p-5 sm:p-6 shadow-[0_4px_14px_rgba(10,31,28,0.04)]">
          {loading || marketplaceLoading || marketplaceItemsLoading ? (
            <div className="property-catalog-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : (savedPropertiesError || savedListingsError || marketplaceError) && totalFavorites === 0 ? (
            <div className="py-20 px-6 text-center flex flex-col items-center gap-4">
              <p role="alert" className="max-w-lg text-sm text-red-700">
                {savedPropertiesError || savedListingsError || 'No se pudieron cargar algunos servicios o materiales guardados. Comprueba la conexión e inténtalo de nuevo.'}
              </p>
              <Button variant="outline" className="rounded-full h-10 px-5 text-sm font-bold" onClick={retryAllFavorites}>
                Reintentar
              </Button>
            </div>
          ) : totalFavorites === 0 ? (
            <div className="py-24 px-6 text-center flex flex-col items-center gap-5">
              <svg aria-hidden="true" focusable="false" className="w-28 h-28 mb-2" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="30" r="4" fill="#fda4af" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                <circle cx="75" cy="25" r="3" fill="#fecdd3" className="animate-ping" style={{ animationDuration: '3s' }} />
                <circle cx="80" cy="70" r="5" fill="#ffe4e6" className="animate-bounce" style={{ animationDuration: '4s' }} />
                <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
                  <path d="M50 82C50 82 18 56.402 18 36.5C18 22.969 28.522 12 41.5 12C46.883 12 50 15 50 15C50 15 53.117 12 58.5 12C71.478 12 82 22.969 82 36.5C82 56.402 50 82 50 82Z"
                        fill="url(#heartGradient)" stroke="#e11d48" strokeWidth="2.5" strokeLinejoin="round" />
                  <circle cx="36" cy="28" r="5" fill="white" opacity="0.3" />
                </g>
                <defs>
                  <linearGradient id="heartGradient" x1="50" y1="12" x2="50" y2="82" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#be123c" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="max-w-sm">
                <h2 className="text-xl font-extrabold text-neutral-900">
                  Todavía no tienes favoritos
                </h2>
                <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                  {marketplaceFavoritesEnabled ? 'Guarda propiedades, servicios o materiales desde sus catálogos para encontrarlos aquí.' : 'Guarda propiedades desde los resultados para encontrarlas rápido después.'}
                </p>
              </div>
              <Button
                className="rounded-full h-10 px-5 text-sm font-bold bg-[#035f53] hover:bg-[#024a41] text-white"
                onClick={onGoResults}
              >
                Buscar propiedades
              </Button>
              {marketplaceFavoritesEnabled && <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={onGoServices}>Explorar servicios</Button>
                <Button variant="outline" onClick={onGoMaterials}>Explorar materiales</Button>
              </div>}
            </div>
          ) : (
            <>
              {(savedPropertiesError || savedListingsError || marketplaceError) && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <span>{savedPropertiesError || savedListingsError || 'No se pudieron cargar algunos servicios o materiales guardados. Comprueba la conexión e inténtalo de nuevo.'}</span>
                <Button variant="outline" className="rounded-full h-9 px-4 text-xs font-bold" onClick={retryAllFavorites}>Reintentar</Button>
              </div>}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                <p className="text-sm text-neutral-500">
                  <span className="font-bold text-neutral-800">
                    {visibleFavoriteCount}
                  </span>{' '}
                  {visibleCountLabel}
                </p>
                <div className="favorites-filter flex flex-wrap gap-2" role="group" aria-label="Filtrar favoritos por tipo">
                  <Button type="button" variant="outline" aria-pressed={activeFilter === 'all'} className={`rounded-full h-9 px-4 text-xs font-bold ${activeFilter === 'all' ? 'border-[#035f53] bg-[#035f53] text-white hover:bg-[#024a41] hover:text-white' : ''}`} onClick={() => setActiveFilter('all')}>Todos</Button>
                  <Button type="button" variant="outline" aria-pressed={activeFilter === 'properties'} className={`rounded-full h-9 px-4 text-xs font-bold ${activeFilter === 'properties' ? 'border-[#035f53] bg-[#035f53] text-white hover:bg-[#024a41] hover:text-white' : ''}`} onClick={() => setActiveFilter('properties')}>Propiedades</Button>
                  {marketplaceFavoritesEnabled && <Button type="button" variant="outline" aria-pressed={activeFilter === 'services'} className={`rounded-full h-9 px-4 text-xs font-bold ${activeFilter === 'services' ? 'border-[#035f53] bg-[#035f53] text-white hover:bg-[#024a41] hover:text-white' : ''}`} onClick={() => setActiveFilter('services')}>Servicios</Button>}
                  {marketplaceFavoritesEnabled && <Button type="button" variant="outline" aria-pressed={activeFilter === 'materials'} className={`rounded-full h-9 px-4 text-xs font-bold ${activeFilter === 'materials' ? 'border-[#035f53] bg-[#035f53] text-white hover:bg-[#024a41] hover:text-white' : ''}`} onClick={() => setActiveFilter('materials')}>Materiales</Button>}
                </div>
              </div>

              {visibleFavoriteCount === 0 ? (
                <p role="status" className="rounded-lg bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-600">
                  No tienes {activeFilter === 'properties' ? 'propiedades' : activeFilter === 'services' ? 'servicios' : 'materiales'} guardados.
                </p>
              ) : null}

              {visibleProperties.length > 0 && <div className="property-catalog-grid">
                {visibleProperties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSelected={false}
                    onSelect={onSelectProperty}
                    prioritizeImage={index < 4}
                  />
                ))}
              </div>}

              {(visibleServices.length > 0 || visibleMaterials.length > 0) && (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Servicios y materiales guardados">
                  {visibleServices.map((service, index) => (
                    <article key={`service-${service.id}`} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                      <div className="relative">
                        <button type="button" onClick={() => onOpenService(service.slug)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                          <div className="h-48 bg-emerald-50"><MarketplaceCardImage src={service.galleryUrls[0]} alt="" eager={index < 2} className="h-full w-full object-cover" fallback={<div className="flex h-full items-center justify-center text-emerald-800"><BriefcaseBusiness size={36} /></div>} /></div>
                          <div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Servicio · {HOME_SERVICE_CATEGORY_LABELS[service.category]}</p><h2 className="mt-1 text-lg font-bold text-neutral-900">{service.displayName}</h2><p className="mt-2 flex items-center gap-1 text-sm text-neutral-600"><MapPin size={15} />{service.municipalities.length ? `${service.municipalities.join(', ')} · ` : ''}{service.province}</p></div>
                        </button>
                        <SaveMarketplaceListingButton listingType="service" listingId={service.id} listingTitle={service.displayName} />
                      </div>
                    </article>
                  ))}
                  {visibleMaterials.map((material, index) => (
                    <article key={`material-${material.id}`} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                      <div className="relative">
                        <button type="button" onClick={() => onOpenMaterial(material.slug)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                          <div className="h-48 bg-amber-50"><MarketplaceCardImage src={material.photoUrls[0]} alt="" eager={index < 2} className="h-full w-full object-cover" fallback={<div className="flex h-full items-center justify-center text-amber-800"><Boxes size={36} /></div>} /></div>
                          <div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Material · {MATERIAL_CATEGORY_LABELS[material.category]}</p><h2 className="mt-1 text-lg font-bold text-neutral-900">{material.title}</h2><p className="mt-2 flex items-center gap-1 text-sm text-neutral-600"><MapPin size={15} />{material.province}</p></div>
                        </button>
                        <SaveMarketplaceListingButton listingType="material" listingId={material.id} listingTitle={material.title} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
