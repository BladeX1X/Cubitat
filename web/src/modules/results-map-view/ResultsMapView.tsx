import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BellPlus, List, Map } from 'lucide-react'
import type { Property, OperationType, PropertyType } from '../properties/types'
import { SavePropertyButton } from '../properties/components/SavePropertyButton'
import { PropertyMap } from '../maps/components/PropertyMap'
import { formatPrice } from '../../shared/lib/formatPrice'
import { FilterBar } from '../search/components/FilterBar'
import type { FilterBarProps } from '../search/components/FilterBar'
import { MAP_FULLSCREEN_LAYER_STYLE } from '../../shared/ui/layers'
import { orderPropertiesByIds } from './carouselOrder'

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartamento: 'DEPARTAMENTO',
  casa: 'CASA',
  terreno: 'TERRENO',
}

const OPERATION_LABELS: Record<OperationType, string> = {
  alquiler: 'RENTA',
  venta: 'VENTA',
  permuta: 'PERMUTA',
}

const BADGE_LABELS: Record<NonNullable<Property['badge']>, string> = {
  destacado: 'Destacado',
  exclusivo: 'Exclusivo',
  nuevo: 'Nuevo',
}

export type ResultsMapViewProps = {
  viewMode: 'list' | 'map'
  onViewModeChange: (mode: 'list' | 'map') => void
  properties: Property[]
  selectedPropertyId?: string
  onSelectProperty: (propertyId: string) => void
  onCreateAlert?: () => void
  creatingAlert?: boolean
  filterBarProps: FilterBarProps
}

export type ResultsDesktopMapPanelProps = {
  properties: Property[]
  selectedPropertyId?: string
  selectedPropertyIds?: string[]
  onSelectProperty: (propertyId: string) => void
  onSelectCluster?: (propertyIds: string[]) => void
  onViewportChange?: (propertyIds: string[]) => void
}

type MapPreviewCardProps = {
  property: Property
  isSelected: boolean
  onSelect: (id: string) => void
}

type MapOverlayProps = {
  properties: Property[]
  filterBarProps: FilterBarProps
  carouselPropertyIds: string[] | undefined
  activeCarouselId: string | undefined
  creatingAlert: boolean
  onViewModeChange: (mode: 'list' | 'map') => void
  onCreateAlert?: () => void
  onPinClick: (id: string) => void
  onClusterClick: (ids: string[]) => void
  onCloseCarousel: () => void
  onCardSelect: (id: string) => void
}

function getPropertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPE_LABELS[type] ?? type.toUpperCase()
}

function getOperationLabel(op: OperationType): string {
  return OPERATION_LABELS[op] ?? op.toUpperCase()
}

function getPriceText(property: Property): string {
  if (property.operation === 'permuta') return 'Permuta'
  return property.priceUsd ? formatPrice(property.priceUsd, property.priceCurrency) : '-'
}

function getOperationSuffix(op: OperationType): string {
  if (op === 'alquiler') return 'renta'
  if (op === 'venta') return 'venta'
  return ''
}

function MapPreviewCard({ property, isSelected, onSelect }: MapPreviewCardProps) {
  const [imgError, setImgError] = useState(false)
  const suffix = getOperationSuffix(property.operation)
  const selectProperty = () => onSelect(property.id)

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectProperty()
    }
  }

  return (
    <article
      className={`map-carousel-card${isSelected ? ' map-carousel-card--selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={selectProperty}
      onKeyDown={handleKeyDown}
      aria-label={`${property.title} - ${getPriceText(property)}`}
    >
      <div className="map-carousel-card__img-wrap">
        {!imgError ? (
          <img
            src={property.coverImage}
            alt={`Foto de ${property.title}`}
            className="map-carousel-card__image"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="map-carousel-card__image map-carousel-card__image--fallback" aria-hidden="true" />
        )}
        {property.badge ? (
          <span className="map-carousel-card__badge">{BADGE_LABELS[property.badge]}</span>
        ) : null}
        <SavePropertyButton
          className="map-carousel-card__save"
          propertyId={property.id}
          propertyTitle={property.title}
          iconSize={18}
          iconClassName={(saved) => saved ? 'fill-red-500 text-red-500' : ''}
          preventDefault
          stopPropagation
        />
      </div>

      <div className="map-carousel-card__body">
        <div className="map-carousel-card__chips">
          <span className="property-type-badge">{getPropertyTypeLabel(property.propertyType)}</span>
          <span className="property-operation-badge">{getOperationLabel(property.operation)}</span>
        </div>

        <div className="map-carousel-card__price-row">
          <strong className="map-carousel-card__price">{getPriceText(property)}</strong>
          {suffix ? <span className="map-carousel-card__price-suffix">{suffix}</span> : null}
        </div>

        {property.description ? (
          <p className="map-carousel-card__description">{property.description}</p>
        ) : null}

        <div className="map-carousel-card__meta">
          <span>{property.areaM2} m2</span>
          {property.bedrooms > 0 ? (
            <span>{property.bedrooms} {property.bedrooms === 1 ? 'cuarto' : 'cuartos'}</span>
          ) : null}
          {property.parking > 0 ? (
            <span>{property.parking} {property.parking === 1 ? 'parqueo' : 'parqueos'}</span>
          ) : null}
        </div>

        <p className="map-carousel-card__location">{property.location}</p>
      </div>
    </article>
  )
}

function MapOverlay({
  properties,
  filterBarProps,
  carouselPropertyIds,
  activeCarouselId,
  creatingAlert,
  onViewModeChange,
  onCreateAlert,
  onPinClick,
  onClusterClick,
  onCloseCarousel,
  onCardSelect,
}: MapOverlayProps) {
  const carouselRef = useRef<HTMLDivElement>(null)

  const carouselProperties = useMemo(() => {
    if (!carouselPropertyIds || carouselPropertyIds.length === 0) return []
    return orderPropertiesByIds(properties, carouselPropertyIds)
  }, [carouselPropertyIds, properties])

  const hasCarousel = carouselProperties.length > 0

  useEffect(() => {
    if (!activeCarouselId || !carouselRef.current) return
    const idx = carouselProperties.findIndex((property) => property.id === activeCarouselId)
    if (idx < 0) return
    const card = carouselRef.current.children[idx] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCarouselId, carouselProperties])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.classList.add('has-map-fullscreen-overlay')
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.classList.remove('has-map-fullscreen-overlay')
    }
  }, [])

  return createPortal(
    <div
      className="map-fullscreen-overlay"
      style={MAP_FULLSCREEN_LAYER_STYLE}
      role="dialog"
      aria-label="Vista de mapa"
    >
      <div className="map-overlay-filterbar">
        <FilterBar {...filterBarProps} isSticky={false} />
      </div>

      <div className={`results-map-wrapper${hasCarousel ? ' has-selected-property' : ''}`}>
        <PropertyMap
          properties={properties}
          selectedPropertyId={activeCarouselId}
          selectedPropertyIds={carouselPropertyIds}
          onSelectProperty={onPinClick}
          onSelectCluster={onClusterClick}
        />

        <div className="map-bottom-bar">
          <button
            type="button"
            className="map-bottom-secondary"
            onClick={() => onViewModeChange('list')}
          >
            <List size={15} />
            Ocultar mapa
          </button>
          {onCreateAlert ? (
            <button
              type="button"
              className="map-bottom-primary"
              onClick={onCreateAlert}
              disabled={creatingAlert}
            >
              <BellPlus size={15} />
              {creatingAlert ? 'Guardando...' : 'Crear alerta'}
            </button>
          ) : null}
        </div>

        {hasCarousel ? (
          <div
            key={`${carouselProperties.map((property) => property.id).join('|')}:${activeCarouselId ?? ''}`}
            className="map-property-carousel map-property-carousel--slide-up"
            aria-live="polite"
            aria-label={`${carouselProperties.length} propiedad${carouselProperties.length === 1 ? '' : 'es'}`}
          >
            <button
              type="button"
              className="map-carousel-close"
              aria-label="Cerrar"
              onClick={onCloseCarousel}
            >
              x
            </button>
            {carouselProperties.length > 1 ? (
              <div className="map-carousel-counter">
                {carouselProperties.length} propiedades
              </div>
            ) : null}
            <div className="map-carousel-track" ref={carouselRef}>
              {carouselProperties.map((property) => (
                <MapPreviewCard
                  key={property.id}
                  property={property}
                  isSelected={property.id === activeCarouselId}
                  onSelect={onCardSelect}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ResultsDesktopMapPanel({
  properties,
  selectedPropertyId,
  selectedPropertyIds,
  onSelectProperty,
  onSelectCluster,
  onViewportChange,
}: ResultsDesktopMapPanelProps) {
  return (
    <aside className="results-desktop-map-panel" aria-label="Mapa de resultados">
      <div className="results-map-wrapper results-map-wrapper--desktop">
        <PropertyMap
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          selectedPropertyIds={selectedPropertyIds}
          onSelectProperty={onSelectProperty}
          onSelectCluster={onSelectCluster}
          onViewportChange={onViewportChange}
        />
      </div>
    </aside>
  )
}

export function ResultsMapView({
  viewMode,
  onViewModeChange,
  properties,
  selectedPropertyId,
  onSelectProperty,
  onCreateAlert,
  creatingAlert = false,
  filterBarProps,
}: ResultsMapViewProps) {
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [carouselPropertyIds, setCarouselPropertyIds] = useState<string[] | undefined>(
    selectedPropertyId ? [selectedPropertyId] : undefined,
  )
  const [activeCarouselId, setActiveCarouselId] = useState<string | undefined>(selectedPropertyId)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1021px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (selectedPropertyId) {
      setCarouselPropertyIds([selectedPropertyId])
      setActiveCarouselId(selectedPropertyId)
    }
  }, [selectedPropertyId])

  useEffect(() => {
    if (viewMode === 'list') {
      setCarouselPropertyIds(undefined)
      setActiveCarouselId(undefined)
    }
  }, [viewMode])

  function handlePinClick(id: string) {
    const isSame = carouselPropertyIds?.length === 1 && carouselPropertyIds[0] === id
    if (isSame) {
      setCarouselPropertyIds(undefined)
      setActiveCarouselId(undefined)
    } else {
      setCarouselPropertyIds([id])
      setActiveCarouselId(id)
    }
  }

  function handleClusterClick(ids: string[]) {
    setCarouselPropertyIds(ids)
    setActiveCarouselId(ids[0])
  }

  function handleCardSelect(id: string) {
    setActiveCarouselId(id)
    onSelectProperty(id)
  }

  function handleCloseCarousel() {
    setCarouselPropertyIds(undefined)
    setActiveCarouselId(undefined)
  }

  return (
    <>
      {viewMode === 'list' || (viewMode === 'map' && isDesktopViewport) ? (
        <div className="results-floating-actions" aria-label="Acciones de resultados">
          <button
            type="button"
            className="results-floating-map"
            onClick={() => onViewModeChange(viewMode === 'map' ? 'list' : 'map')}
          >
            {viewMode === 'map' ? <List size={14} /> : <Map size={14} />}
            <span>{viewMode === 'map' ? 'Ocultar mapa' : 'Mostrar mapa'}</span>
          </button>
          {onCreateAlert ? (
            <button
              type="button"
              className="results-floating-alert"
              onClick={onCreateAlert}
              disabled={creatingAlert}
            >
              <BellPlus size={14} />
              <span>{creatingAlert ? 'Guardando...' : 'Crear alerta'}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {viewMode === 'map' && !isDesktopViewport ? (
        <MapOverlay
          properties={properties}
          filterBarProps={filterBarProps}
          carouselPropertyIds={carouselPropertyIds}
          activeCarouselId={activeCarouselId}
          creatingAlert={creatingAlert}
          onViewModeChange={onViewModeChange}
          onCreateAlert={onCreateAlert}
          onPinClick={handlePinClick}
          onClusterClick={handleClusterClick}
          onCloseCarousel={handleCloseCarousel}
          onCardSelect={handleCardSelect}
        />
      ) : null}
    </>
  )
}
