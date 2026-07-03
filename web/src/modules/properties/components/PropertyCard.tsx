import { useState, useEffect, type CSSProperties } from 'react'
import {
  Bath,
  BedDouble,
  Car,
  Heart,
  MessageCircle,
  Ruler,
} from 'lucide-react'
import { formatPrice } from '../../../shared/lib/formatPrice'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '../../../shared/ui/carousel'
import { useSavedProperties } from '../hooks/useSavedProperties'
import type { Property } from '../types'

type PropertyCardProps = {
  property: Property
  isSelected: boolean
  onSelect: (propertyId: string) => void
}

export function PropertyCard({
  property,
  isSelected,
  onSelect,
}: PropertyCardProps) {
  const priceLabel = getPriceLabel(property)
  const [api, setApi] = useState<CarouselApi>()
  const [loadedIndexes, setLoadedIndexes] = useState<number[]>([0])
  const { isSaved, toggleSave } = useSavedProperties()

  const saved = isSaved(property.id)

  useEffect(() => {
    if (!api) return
    const handleSelect = () => {
      const activeIdx = api.selectedScrollSnap()
      setLoadedIndexes((prev) =>
        prev.includes(activeIdx) ? prev : [...prev, activeIdx]
      )
    }
    api.on('select', handleSelect)
    return () => {
      api.off('select', handleSelect)
    }
  }, [api])

  function selectProperty(event: React.MouseEvent | React.KeyboardEvent) {
    // Evitar que el clic en los botones de acción o en las flechas del carrusel dispare la selección
    const target = event.target as HTMLElement
    if (target.closest('.property-contact-btn') || 
        target.closest('.property-whatsapp-btn') || 
        target.closest('.property-save') ||
        target.closest('.property-photo-arrow')) {
      return
    }
    onSelect(property.id)
  }

  const images = [
    property.coverImage,
    property.coverImage.includes('w=900')
      ? property.coverImage.replace('w=900', 'w=901')
      : `${property.coverImage}&w=901`,
    property.coverImage.includes('w=900')
      ? property.coverImage.replace('w=900', 'w=902')
      : `${property.coverImage}&w=902`,
  ]

  return (
    <article
      className={`property-card ${isSelected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Ver ${property.title}`}
      onClick={(e) => selectProperty(e)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectProperty(event)
        }
      }}
    >
      <div className="property-photo">
        <Carousel className="w-full h-full group" opts={{ loop: true }} setApi={setApi}>
          <CarouselContent className="-ml-0 h-full">
            {images.map((image, index) => (
              <CarouselItem key={index} className="pl-0 h-full w-full">
                <div
                  className="property-photo-slide"
                  style={
                    {
                      '--cover-tone': property.coverTone,
                      '--cover-image': loadedIndexes.includes(index) ? `url("${image}")` : 'none',
                    } as CSSProperties
                  }
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        {property.badge ? (
          <Badge className="property-badge">{property.badge}</Badge>
        ) : null}
        <button
          className="property-save"
          type="button"
          aria-label={saved ? `Quitar ${property.title} de guardados` : `Guardar ${property.title}`}
          onClick={(event) => {
            event.stopPropagation()
            toggleSave(property.id)
          }}
        >
          <Heart size={19} className={saved ? 'fill-red-500 text-red-500' : ''} />
        </button>
      </div>

      <div className="property-info">
        {/* Row 1: Badges */}
        <div className="property-badges-row">
          <span className="property-type-badge">
            {property.propertyType === 'apartamento' ? 'DEPARTAMENTO' : property.propertyType === 'casa' ? 'CASA' : 'TERRENO'}
          </span>
          <span className="property-operation-badge">
            {property.operation === 'alquiler' ? 'RENTA' : property.operation === 'venta' ? 'VENTA' : 'PERMUTA'}
          </span>
        </div>

        {/* Row 2: Price */}
        <div className="property-price-row">{priceLabel}</div>

        {/* Row 3: Description/Title */}
        <h3 className="property-title">
          {property.title}
        </h3>

        {/* Row 4: Specs Grid */}
        <div className="property-specs-grid" aria-label="Características">
          <span className="spec-item">
            <BedDouble size={14} className="spec-icon" />
            {Math.floor(property.bedrooms)} Recám.
          </span>
          <span className="spec-item">
            <Bath size={14} className="spec-icon" />
            {Math.floor(property.bathrooms)} Baño
          </span>
          <span className="spec-item">
            <Ruler size={14} className="spec-icon" />
            {property.areaM2} m²
          </span>
          <span className="spec-item">
            <Car size={14} className="spec-icon" />
            {property.parking} Auto
          </span>
          <span className="spec-item text-neutral-400 font-semibold">
            Mascota
          </span>
          <span className="spec-item text-neutral-400 font-semibold">
            ...
          </span>
        </div>

        {/* Row 5: Actions */}
        <div className="property-actions">
          <Button
            variant="outline"
            className="property-contact-btn"
            type="button"
            size="sm"
            onClick={(event) => event.stopPropagation()}
          >
            Contactar
          </Button>
          <Button
            className="property-whatsapp-btn"
            type="button"
            size="sm"
            onClick={(event) => event.stopPropagation()}
          >
            <MessageCircle size={14} fill="white" className="stroke-none shrink-0" />
            Consultar
          </Button>
        </div>
      </div>
    </article>
  )
}

function getPriceLabel(property: Property) {
  if (property.operation === 'permuta') {
    return 'Permuta'
  }

  const formattedPrice = formatPrice(property.priceUsd)

  if (property.operation === 'alquiler') {
    return `${formattedPrice} USD / mes`
  }

  return `${formattedPrice} USD`
}
