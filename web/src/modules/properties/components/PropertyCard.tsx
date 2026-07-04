import { useEffect, useState } from 'react'
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
import { getPropertyGalleryImages, optimizePropertyCardImage } from '../utils/images'

type PropertyCardProps = {
  property: Property
  isSelected: boolean
  onSelect: (propertyId: string) => void
  prioritizeImage?: boolean
}

export function PropertyCard({
  property,
  isSelected,
  onSelect,
  prioritizeImage = false,
}: PropertyCardProps) {
  const priceLabel = getPriceLabel(property)
  const { isSaved, toggleSave } = useSavedProperties()
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const saved = isSaved(property.id)

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

  const images = getPropertyGalleryImages(property.coverImage, property.images).map(optimizePropertyCardImage)
  const hasMultipleImages = images.length > 1

  useEffect(() => {
    if (!carouselApi) return

    function updateSelectedImage() {
      setActiveImageIndex(carouselApi?.selectedScrollSnap() ?? 0)
    }

    updateSelectedImage()
    carouselApi.on('select', updateSelectedImage)
    carouselApi.on('reInit', updateSelectedImage)

    return () => {
      carouselApi.off('select', updateSelectedImage)
      carouselApi.off('reInit', updateSelectedImage)
    }
  }, [carouselApi])

  return (
    <article
      className={`property-card ${isSelected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={(e) => selectProperty(e)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectProperty(event)
        }
      }}
    >
      <div className="property-photo">
        <Carousel className="w-full h-full group" opts={{ loop: hasMultipleImages }} setApi={setCarouselApi}>
          <CarouselContent className="-ml-0 h-full">
            {images.map((image, index) => {
              const shouldRenderImage = index === 0 || index === activeImageIndex

              return (
              <CarouselItem key={index} className="pl-0 h-full w-full">
                {shouldRenderImage ? (
                  <img
                    className="property-photo-slide"
                    src={image}
                    alt=""
                    loading={prioritizeImage && index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={prioritizeImage && index === 0 ? 'high' : 'auto'}
                    style={{ backgroundColor: property.coverTone }}
                  />
                ) : (
                  <div
                    className="property-photo-slide property-photo-slide-placeholder"
                    style={{ backgroundColor: property.coverTone }}
                  />
                )}
              </CarouselItem>
              )
            })}
          </CarouselContent>
          {hasMultipleImages && (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          )}
        </Carousel>
        {hasMultipleImages && (
          <div className="property-photo-dots" aria-label="Fotos de la propiedad">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                className={`property-photo-dot ${activeImageIndex === index ? 'is-active' : ''}`}
                aria-label={`Ver foto ${index + 1}`}
                aria-current={activeImageIndex === index ? 'true' : undefined}
                onClick={(event) => {
                  event.stopPropagation()
                  carouselApi?.scrollTo(index)
                }}
              >
                <span />
              </button>
            ))}
          </div>
        )}
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
        <h2 className="property-title">
          {property.title}
        </h2>

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
          <span className="spec-item text-neutral-600 font-semibold">
            Mascota
          </span>
          <span className="spec-item text-neutral-600 font-semibold">
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
