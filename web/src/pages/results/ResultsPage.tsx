import { useEffect, useMemo, useState } from 'react'
import { useSEO } from '../../shared/hooks/useSEO'
import { PropertyCard } from '../../modules/properties/components/PropertyCard'
import { PropertyCardSkeleton } from '../../modules/properties/components/PropertyCardSkeleton'
import { FilterBar } from '../../modules/search/components/FilterBar'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'
import { Button } from '../../shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../shared/ui/popover'

type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'area-desc'

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
}

export function ResultsPage({
  filters,
  properties,
  selectedPropertyId,
  loading = false,
  onSelectProperty,
  onClearFilters,
  onChangeFilters,
}: ResultsPageProps) {
  const [isSticky, setIsSticky] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const PAGE_SIZE = 16

  // Dynamic document title and description
  const isRent = filters.operations.includes('alquiler')
  const isSale = filters.operations.includes('venta')
  const isSwap = filters.operations.includes('permuta')

  let operationText = 'Propiedades'
  if (isRent) operationText = 'Casas y Apartamentos en Renta'
  else if (isSale) operationText = 'Inmuebles en Venta'
  else if (isSwap) operationText = 'Permutas de Viviendas'

  const locationText = filters.query ? ` en ${filters.query}` : ' en Cuba'
  const title = `${operationText}${locationText}`
  const description = `Encuentra las mejores ofertas de ${operationText.toLowerCase()}${locationText} con fotos, precios actualizados y mapas interactivos en Cubitat.`

  useSEO({ title, description })

  // Reset to first page when properties (filters) change
  useEffect(() => {
    setCurrentPage(1)
  }, [properties, sortBy])

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
  const totalPages = Math.ceil(sortedProperties.length / PAGE_SIZE)
  const paginatedProperties = sortedProperties.slice(
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
      />

      <div className="catalog-container">
        <div className="results-heading">
          <div>
            <p className="eyebrow">Resultados destacados</p>
            <h1>{properties.length} propiedades en Cuba</h1>
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
            <PopoverContent align="end" className="w-64 p-2 bg-white border border-neutral-200 shadow-lg rounded-md">
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
          Encuentra viviendas por zona, compara precios y contacta al
          anunciante desde una busqueda clara y rapida.
        </p>

        <div className="property-catalog-grid">
          {loading ? (
            <PropertyCardSkeleton count={6} />
          ) : (
            paginatedProperties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={property.id === selectedPropertyId}
                onSelect={onSelectProperty}
                prioritizeImage={index < 4}
              />
            ))
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
    </section>
  )
}
