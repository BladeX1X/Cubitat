import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useSEO } from '../../shared/hooks/useSEO'
import { PropertyCard } from '../../modules/properties/components/PropertyCard'
import { PropertyCardSkeleton } from '../../modules/properties/components/PropertyCardSkeleton'
import { FilterBar } from '../../modules/search/components/FilterBar'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'
import { buildRelatedSeoRoutes, type SeoResultsRoute } from '../../modules/search/seoRoutes'
import { useSearchAlerts } from '../../modules/search/hooks/useSearchAlerts'
import { Button } from '../../shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../shared/ui/popover'
import { ResultsDesktopMapPanel, ResultsMapView } from '../../modules/results-map-view'

type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'area-desc'
const PENDING_SEARCH_ALERT_KEY = 'cubitat-pending-search-alert'

const sortOptions: Array<{ value: SortOption; label: string; helper: string }> = [
  {
    value: 'relevance',
    label: 'Relevancia',
    helper: 'Orden original de resultados',
  },
  {
    value: 'price-asc',
    label: 'Menor precio',
    helper: 'Primero las opciones mas economicas',
  },
  {
    value: 'price-desc',
    label: 'Mayor precio',
    helper: 'Primero las propiedades de mayor valor',
  },
  {
    value: 'area-desc',
    label: 'Mayor superficie',
    helper: 'Primero los inmuebles mas amplios',
  },
]

export type ResultsPageProps = {
  filters: SearchFilters
  properties: Property[]
  selectedPropertyId?: string
  loading?: boolean
  onSelectProperty: (propertyId: string) => void
  onClearFilters: () => void
  onChangeFilters?: (filters: SearchFilters) => void
  seoRoute?: SeoResultsRoute | null
  user?: User | null
  onRequireLogin?: () => void
}

export function ResultsPage({
  filters,
  properties,
  selectedPropertyId,
  loading = false,
  onSelectProperty,
  onClearFilters,
  onChangeFilters,
  seoRoute,
  user,
  onRequireLogin,
}: ResultsPageProps) {
  const [isSticky, setIsSticky] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [mapScopedPropertyIds, setMapScopedPropertyIds] = useState<string[] | null>(null)
  const [desktopMapPropertyId, setDesktopMapPropertyId] = useState<string | undefined>(selectedPropertyId)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const pendingAlertProcessedRef = useRef(false)
  const { createAlert, creating: creatingSearchAlert } = useSearchAlerts(user?.id)
  const PAGE_SIZE = 15

  // Dynamic document title and description
  const isRent = filters.operations.includes('alquiler')
  const isSale = filters.operations.includes('venta')
  const isSwap = filters.operations.includes('permuta')

  let operationText = 'Propiedades'
  if (isRent) operationText = 'Casas y Apartamentos en Renta'
  else if (isSale) operationText = 'Inmuebles en Venta'
  else if (isSwap) operationText = 'Permutas de Viviendas'

  const locationText = filters.query ? ` en ${filters.query}` : ' en Cuba'
  const title = seoRoute?.title ?? `${operationText}${locationText}`
  const description = seoRoute?.description ?? `Encuentra las mejores ofertas de ${operationText.toLowerCase()}${locationText} con fotos, precios actualizados y mapas interactivos en Cubitat.`
  const heading = seoRoute?.heading ?? `${properties.length} propiedades en Cuba`
  const relatedSeoRoutes = seoRoute ? buildRelatedSeoRoutes(seoRoute) : []

  useSEO({ title, description })

  // Reset to first page when properties (filters) change
  useEffect(() => {
    setCurrentPage(1)
  }, [properties, sortBy, mapScopedPropertyIds])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1021px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (viewMode === 'list') {
      setMapScopedPropertyIds(null)
    }
  }, [viewMode])

  useEffect(() => {
    setDesktopMapPropertyId(selectedPropertyId)
  }, [selectedPropertyId])

  useEffect(() => {
    if (!user || pendingAlertProcessedRef.current) return

    const rawPendingAlert = window.localStorage.getItem(PENDING_SEARCH_ALERT_KEY)
    if (!rawPendingAlert) return

    pendingAlertProcessedRef.current = true

    try {
      const pendingFilters = JSON.parse(rawPendingAlert) as SearchFilters
      createAlert(pendingFilters)
        .then(() => {
          window.localStorage.removeItem(PENDING_SEARCH_ALERT_KEY)
          setAlertError(null)
          setAlertMessage('Alerta creada. La veras en Mi cuenta.')
        })
        .catch(() => {
          pendingAlertProcessedRef.current = false
          setAlertError('No se pudo crear la alerta despues de iniciar sesion.')
        })
    } catch {
      window.localStorage.removeItem(PENDING_SEARCH_ALERT_KEY)
      pendingAlertProcessedRef.current = false
    }
  }, [createAlert, user])

  // Sticky toolbar detection using IntersectionObserver
  useEffect(() => {
    const sentinel = document.getElementById('sticky-sentinel')
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: [1] }
    )
    observer.observe(sentinel)
    return () => {
      observer.unobserve(sentinel)
    }
  }, [])

  const sortedProperties = useMemo(() => {
    if (sortBy === 'relevance') return properties

    return [...properties].sort((a, b) => {
      if (sortBy === 'price-asc') {
        return (a.priceUsd ?? Number.MAX_SAFE_INTEGER) - (b.priceUsd ?? Number.MAX_SAFE_INTEGER)
      }

      if (sortBy === 'price-desc') {
        return (b.priceUsd ?? 0) - (a.priceUsd ?? 0)
      }

      return b.areaM2 - a.areaM2
    })
  }, [properties, sortBy])

  const activeSortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? 'Ordenar'
  const listedProperties = useMemo(() => {
    if (!isDesktopViewport || viewMode !== 'map' || mapScopedPropertyIds === null) return sortedProperties

    const visibleIds = new Set(mapScopedPropertyIds)
    return sortedProperties.filter((property) => visibleIds.has(property.id))
  }, [isDesktopViewport, mapScopedPropertyIds, sortedProperties, viewMode])
  const totalPages = Math.ceil(listedProperties.length / PAGE_SIZE)
  const paginatedProperties = listedProperties.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const sentinel = document.getElementById('sticky-sentinel')
    if (sentinel) {
      sentinel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleCreateSearchAlert = async () => {
    setAlertMessage(null)
    setAlertError(null)

    if (!user) {
      window.localStorage.setItem(PENDING_SEARCH_ALERT_KEY, JSON.stringify(filters))
      onRequireLogin?.()
      setAlertMessage('Inicia sesion para guardar esta alerta.')
      return
    }

    try {
      await createAlert(filters)
      setAlertMessage('Alerta creada. La veras en Mi cuenta.')
    } catch {
      setAlertError('No se pudo crear la alerta. Intentalo de nuevo.')
    }
  }

  const handleDesktopMapPropertySelect = (propertyId: string) => {
    setDesktopMapPropertyId(propertyId)
    const card = document.querySelector(`[data-property-card-id="${propertyId}"]`)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleDesktopMapClusterSelect = (propertyIds: string[]) => {
    setMapScopedPropertyIds(propertyIds)
    setDesktopMapPropertyId(propertyIds[0])
  }

  const handleDesktopMapViewportChange = (propertyIds: string[]) => {
    setMapScopedPropertyIds(propertyIds)
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) {
        pages.push('...')
      }
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <section
      className="workspace-catalog"
      id="resultados"
      aria-label="Resultados de busqueda"
    >
      <div id="sticky-sentinel" style={{ height: '1px', marginBottom: '-1px' }}></div>
      <FilterBar
        filters={filters}
        isSticky={isSticky}
        onClearFilters={onClearFilters}
        onChangeFilters={onChangeFilters}
        totalResults={properties.length}
        onCreateAlert={handleCreateSearchAlert}
        creatingAlert={creatingSearchAlert}
        alertMessage={alertMessage}
        alertError={alertError}
      />

      <ResultsMapView
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        properties={sortedProperties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={onSelectProperty}
        onCreateAlert={handleCreateSearchAlert}
        creatingAlert={creatingSearchAlert}
        filterBarProps={{
          filters,
          isSticky: false,
          onClearFilters,
          onChangeFilters,
          totalResults: properties.length,
          onCreateAlert: handleCreateSearchAlert,
          creatingAlert: creatingSearchAlert,
          alertMessage,
          alertError,
        }}
      />

        <div className={`results-desktop-shell${viewMode === 'map' && isDesktopViewport ? ' is-map-open' : ''}`}>
          <div className="catalog-container results-list-panel">
          <div className="results-heading">
            <div>
              <p className="eyebrow">Resultados destacados</p>
              <h1>{heading}</h1>
              <span className="mobile-results-count">
                {listedProperties.length} resultado{listedProperties.length === 1 ? '' : 's'} disponibles
              </span>
            </div>
            <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
              <PopoverTrigger asChild>
                <Button
                  className="sort-button"
                  type="button"
                  variant="outline"
                  aria-label={`Ordenar resultados: ${activeSortLabel}`}
                >
                  {activeSortLabel === 'Relevancia' ? 'Ordenar' : activeSortLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" sideOffset={8} avoidCollisions={false} className="w-64 p-2 bg-white border border-neutral-200 shadow-lg rounded-md">
                <div className="px-2 py-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#035f53]">
                    Ordenar por
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {sortOptions.map((option) => {
                    const isActive = option.value === sortBy

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-[#035f53]/10 text-[#035f53]'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                        aria-pressed={isActive}
                        onClick={() => {
                          setSortBy(option.value)
                          setIsSortOpen(false)
                        }}
                      >
                        <span className="block text-sm font-bold">{option.label}</span>
                        <span className="block text-xs text-neutral-500">{option.helper}</span>
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <p className="results-summary">
            {seoRoute?.intro ?? 'Encuentra viviendas por zona, compara precios y contacta al anunciante desde una busqueda clara y rapida.'}
            {viewMode === 'map' && isDesktopViewport && mapScopedPropertyIds !== null ? ` Mostrando ${listedProperties.length} en el area visible del mapa.` : ''}
          </p>

          <div className="property-catalog-grid">
            {loading ? (
              <PropertyCardSkeleton count={6} />
            ) : paginatedProperties.length > 0 ? (
              paginatedProperties.map((property, index) => (
                <div
                  key={property.id}
                  className="property-catalog-item"
                  data-property-card-id={property.id}
                >
                    <PropertyCard
                      property={property}
                      isSelected={property.id === selectedPropertyId || property.id === desktopMapPropertyId}
                      onSelect={onSelectProperty}
                      prioritizeImage={index < 4}
                  />
                </div>
              ))
            ) : (
              <div className="results-empty-state">
                <p className="eyebrow">Sin resultados</p>
                <h2>
                  {seoRoute
                    ? 'Todavia no hay anuncios para esta busqueda'
                    : 'No encontramos propiedades con esos filtros'}
                </h2>
                {seoRoute ? (
                  <p>
                    Esta pagina se actualiza cuando entren nuevos anuncios. Mientras tanto puedes explorar busquedas relacionadas en {seoRoute.province} o ampliar los filtros.
                  </p>
                ) : null}
                {relatedSeoRoutes.length > 0 ? (
                  <div className="results-empty-links" aria-label="Busquedas relacionadas">
                    {relatedSeoRoutes.map((route) => (
                      <a key={route.path} href={route.path}>
                        {route.label}
                      </a>
                    ))}
                  </div>
                ) : null}
                <Button
                  type="button"
                  className="results-empty-action"
                  onClick={onClearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="results-pagination flex items-center justify-center gap-2 mt-12 pb-6 select-none animate-fadeIn">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-full px-4 h-9 text-xs font-bold border-neutral-300 text-neutral-700 disabled:opacity-40 transition-colors"
              >
                Anterior
              </Button>

              <div className="flex items-center gap-1.5 mx-2">
                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 text-neutral-500 text-xs font-bold">
                        ...
                      </span>
                    )
                  }
                  const isCurrent = pageNum === currentPage
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum as number)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                        isCurrent
                          ? 'bg-[#035f53] text-white shadow-md'
                          : 'text-neutral-700 hover:bg-neutral-100 active:scale-95'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-full px-4 h-9 text-xs font-bold border-neutral-300 text-neutral-700 disabled:opacity-40 transition-colors"
              >
                Siguiente
              </Button>
            </div>
          )}
          </div>

          {viewMode === 'map' && isDesktopViewport ? (
            <ResultsDesktopMapPanel
              properties={sortedProperties}
              selectedPropertyId={desktopMapPropertyId}
              onSelectProperty={handleDesktopMapPropertySelect}
              onSelectCluster={handleDesktopMapClusterSelect}
              onViewportChange={handleDesktopMapViewportChange}
              onClose={() => setViewMode('list')}
              onCreateAlert={handleCreateSearchAlert}
              creatingAlert={creatingSearchAlert}
            />
          ) : null}
        </div>
    </section>
  )
}
