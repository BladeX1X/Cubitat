import { useEffect, useState, type ReactNode } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from './carousel'

type CatalogCardGalleryProps = {
  images: string[]
  label: string
  eager?: boolean
  fallback: ReactNode
  renderImage: (src: string, index: number, eager: boolean) => ReactNode
  overlay?: ReactNode
  status?: ReactNode
  mediaClassName?: string
  activeIndex?: number
  onActiveIndexChange?: (index: number) => void
}

/** Shared photo carousel for service and material catalog cards. */
export function CatalogCardGallery({ images, label, eager = false, fallback, renderImage, overlay, status, mediaClassName = 'property-photo catalog-card__media', activeIndex, onActiveIndexChange }: CatalogCardGalleryProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [internalActiveImageIndex, setInternalActiveImageIndex] = useState(0)
  const activeImageIndex = activeIndex ?? internalActiveImageIndex
  const hasMultipleImages = images.length > 1

  useEffect(() => {
    if (!carouselApi) return
    const updateSelectedImage = () => {
      const nextIndex = carouselApi.selectedScrollSnap()
      setInternalActiveImageIndex(nextIndex)
      onActiveIndexChange?.(nextIndex)
    }
    updateSelectedImage()
    carouselApi.on('select', updateSelectedImage)
    carouselApi.on('reInit', updateSelectedImage)
    return () => {
      carouselApi.off('select', updateSelectedImage)
      carouselApi.off('reInit', updateSelectedImage)
    }
  }, [carouselApi, onActiveIndexChange])

  useEffect(() => {
    if (!carouselApi || activeIndex == null || carouselApi.selectedScrollSnap() === activeIndex) return
    carouselApi.scrollTo(Math.max(0, Math.min(activeIndex, images.length - 1)))
  }, [activeIndex, carouselApi, images.length])

  return (
    <div className={mediaClassName}>
      {images.length ? (
        <Carousel className="h-full w-full group" opts={{ loop: hasMultipleImages }} setApi={setCarouselApi}>
          <CarouselContent className="-ml-0 h-full">
            {images.map((src, index) => (
              <CarouselItem key={`${src}-${index}`} className="h-full w-full pl-0">
                {renderImage(src, index, eager && index === 0)}
              </CarouselItem>
            ))}
          </CarouselContent>
          {hasMultipleImages && (
            <div className="property-carousel-controls" aria-label={`${label}: navegación de fotos`}>
              <CarouselPrevious aria-label="Foto anterior" />
              <CarouselNext aria-label="Foto siguiente" />
            </div>
          )}
        </Carousel>
      ) : fallback}
      {hasMultipleImages && (
        <div className="property-photo-dots" role="group" aria-label={`Fotos de ${label}`}>
          {images.map((src, index) => (
            <button
              key={`${src}-dot-${index}`}
              type="button"
              className={`property-photo-dot ${activeImageIndex === index ? 'is-active' : ''}`}
              aria-label={`Ver foto ${index + 1}`}
              aria-current={activeImageIndex === index ? 'true' : undefined}
              onClick={() => carouselApi?.scrollTo(index)}
            ><span /></button>
          ))}
        </div>
      )}
      {status}
      {overlay}
    </div>
  )
}
