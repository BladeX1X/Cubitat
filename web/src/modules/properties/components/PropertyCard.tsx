import { useEffect, useRef, useState } from 'react'
import {
  Bath,
  BedDouble,
  Car,
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
import { SavePropertyButton } from './SavePropertyButton'
import type { Property } from '../types'
import { normalizePhoneForTel, normalizePhoneForWhatsApp } from '../utils/contact'
import {
  getPropertyGalleryImages,
  optimizePropertyCardImage,
  PROPERTY_IMAGE_FALLBACK,
} from '../utils/images'
import { VerificationBadge } from '../../kyc/components/VerificationBadge'
import { PHASE_TWO_ENABLED } from '../../../shared/config/features'

type PropertyCardProps = {
  property: Property
  isSelected: boolean
  onSelect: (propertyId: string, autoScroll?: boolean) => void
  prioritizeImage?: boolean
}

export function PropertyCard({
  property,
  isSelected,
  onSelect,
  prioritizeImage = false,
}: PropertyCardProps) {
  const priceLabel = getPriceLabel(property)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const photoPointerStartRef = useRef<{ x: number; y: number } | null>(null)

  function selectProperty() {
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
    >
      <button
        className="property-card-hit-target"
        type="button"
        aria-label={`Ver ${property.title}`}
        onClick={selectProperty}
      />
      <div
        className="property-photo"
        onPointerDown={(event) => {
          photoPointerStartRef.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={(event) => {
          const start = photoPointerStartRef.current
          photoPointerStartRef.current = null
          if (!start) return

          const deltaX = Math.abs(event.clientX - start.x)
          const deltaY = Math.abs(event.clientY - start.y)
          if (deltaX < 8 && deltaY < 8) {
            selectProperty()
          }
        }}
      >
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
                      width="400"
                      height="225"
                      loading={prioritizeImage && index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={prioritizeImage && index === 0 ? 'high' : 'low'}
                      style={{ backgroundColor: property.coverTone, aspectRatio: '16/9' }}
                      onError={(event) => {
                        event.currentTarget.src = PROPERTY_IMAGE_FALLBACK
                      }}
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
            <div
              className="property-carousel-controls"
              aria-hidden="true"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onPointerUp={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <CarouselPrevious />
              <CarouselNext />
            </div>
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
        <SavePropertyButton
          className="property-save"
          propertyId={property.id}
          propertyTitle={property.title}
          iconSize={19}
          iconClassName={(saved) => saved ? 'fill-red-500 text-red-500' : ''}
          preventDefault
          stopPropagation
        />
      </div>

      <div className="property-info">
        {/* Row 1: Badges */}
        <div className="property-badges-row flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="property-type-badge">
              {property.propertyType === 'apartamento' ? 'DEPARTAMENTO' : property.propertyType === 'casa' ? 'CASA' : 'TERRENO'}
            </span>
            <span className="property-operation-badge">
              {property.operation === 'alquiler' ? 'RENTA' : property.operation === 'venta' ? 'VENTA' : 'PERMUTA'}
            </span>
          </div>
          {PHASE_TWO_ENABLED && (property.user_id === 'f3000000-0000-0000-0000-000000000001' || property.user_id === 'f3000000-0000-0000-0000-000000000003') && (
            <VerificationBadge status="verified" compact />
          )}
        </div>

        {/* Row 2: Price */}
        <div className="property-price-row">{priceLabel}</div>

        {/* Row 3: Description/Title */}
        <h2 className="property-title">
          {property.title}
        </h2>

        {/* Row 4: Specs Grid */}
        <div className="property-specs-grid" aria-label="Características">
          {property.bedrooms > 0 && (
            <span className="spec-item">
              <BedDouble size={14} className="spec-icon" />
              {Math.floor(property.bedrooms)} Recám.
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="spec-item">
              <Bath size={14} className="spec-icon" />
              {Math.floor(property.bathrooms)} Baño
            </span>
          )}
          <span className="spec-item">
            <Ruler size={14} className="spec-icon" />
            {property.areaM2} m²
          </span>
          {property.parking > 0 && (
            <span className="spec-item">
              <Car size={14} className="spec-icon" />
              {property.parking} Auto
            </span>
          )}
        </div>

        {/* Row 5: Actions */}
        <div className="property-actions">
          <Button
            variant="outline"
            className="property-contact-btn"
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              const phone = property.contact_info?.phone
              if (phone) {
                window.location.href = `tel:${normalizePhoneForTel(phone)}`
              } else {
                onSelect(property.id, true)
              }
            }}
          >
            Contactar
          </Button>
          <Button
            className="property-whatsapp-btn"
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              const phone = property.contact_info?.phone
              if (phone) {
                window.open(`https://wa.me/${normalizePhoneForWhatsApp(phone)}`, '_blank')
              } else {
                onSelect(property.id, true)
              }
            }}
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
    return `${formattedPrice} / mes`
  }

  return formattedPrice
}
