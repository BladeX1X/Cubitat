import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Share2, X } from 'lucide-react'
import { CatalogCardGallery } from './CatalogCardGallery'
import './MarketplaceListingDetail.css'

type MarketplaceListingDetailProps = {
  backLabel: string
  breadcrumb: string
  category: string
  title: string
  location: string
  price?: ReactNode
  summary?: ReactNode
  images: string[]
  imageLabel: string
  eagerImage?: boolean
  imageFallback: ReactNode
  imageUnavailable?: boolean
  renderImage: (src: string, index: number, eager: boolean) => ReactNode
  favoriteAction?: ReactNode
  mapLabel: string
  mapContent: ReactNode
  contactActions: ReactNode
  contactPanel: ReactNode
  onBack: () => void
  children: ReactNode
  footer?: ReactNode
}

export function MarketplaceListingDetail({
  backLabel,
  breadcrumb,
  category,
  title,
  location,
  price,
  summary,
  images,
  imageLabel,
  eagerImage = true,
  imageFallback,
  imageUnavailable = false,
  renderImage,
  favoriteAction,
  mapLabel,
  mapContent,
  contactActions,
  contactPanel,
  onBack,
  children,
  footer,
}: MarketplaceListingDetailProps) {
  const [shareStatus, setShareStatus] = useState('')
  const [isMediaOpen, setIsMediaOpen] = useState(false)
  const [mediaTab, setMediaTab] = useState<'photos' | 'map'>('photos')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const updateActiveImageIndex = useCallback((index: number) => setActiveImageIndex(index), [])
  const closeMedia = useCallback(() => setIsMediaOpen(false), [])

  useEffect(() => {
    if (!isMediaOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMedia()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeMedia, isMediaOpen])

  async function shareListing() {
    const shareData = { title, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(shareData)
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url)
        setShareStatus('Enlace copiado')
      } else {
        setShareStatus('No se pudo compartir desde este navegador')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareStatus('No se pudo compartir. Inténtalo de nuevo.')
    }
  }

  return (
    <main className="marketplace-detail-page">
      <div className="marketplace-detail-container">
        <div className="marketplace-detail-toolbar">
          <button type="button" onClick={onBack} className="marketplace-detail-back">
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{backLabel}</span>
          </button>
          <div className="marketplace-detail-actions" aria-label="Acciones del anuncio">
            <button type="button" className="marketplace-detail-action" onClick={() => void shareListing()}>
              <Share2 size={17} aria-hidden="true" />
              <span>Compartir</span>
            </button>
            {favoriteAction}
          </div>
          <span role="status" className="sr-only">{shareStatus}</span>
        </div>
        <nav className="marketplace-detail-breadcrumb" aria-label="Ruta de navegación">
          <span>Inicio</span><span aria-hidden="true">/</span><span>{breadcrumb}</span><span aria-hidden="true">/</span><span>{category}</span>
        </nav>

        <section className="marketplace-detail-hero" aria-labelledby="marketplace-detail-title">
          <div className="marketplace-detail-intro">
            <p className="marketplace-detail-category">{category}</p>
            <h1 id="marketplace-detail-title">{title}</h1>
            <p className="marketplace-detail-location">{location}</p>
            {price && <div className="marketplace-detail-price">{price}</div>}
            {summary && <div className="marketplace-detail-summary">{summary}</div>}
            <div className="marketplace-detail-hero-contact">{contactActions}</div>
          </div>
          <CatalogCardGallery
            images={images}
            label={imageLabel}
            eager={eagerImage}
            fallback={imageFallback}
            renderImage={renderImage}
            mediaClassName="property-photo marketplace-detail-gallery"
            status={imageUnavailable && images.length > 0 && <span role="status" className="marketplace-detail-photo-warning">Algunas fotos no están disponibles temporalmente.</span>}
            activeIndex={activeImageIndex}
            onActiveIndexChange={updateActiveImageIndex}
            overlay={(
              <div className="marketplace-detail-media-actions" aria-label="Fotos y mapa del anuncio">
                <button type="button" aria-label="Abrir fotos" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMediaTab('photos'); setIsMediaOpen(true) }}>Fotos</button>
                <button type="button" aria-label="Abrir mapa" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMediaTab('map'); setIsMediaOpen(true) }}>Mapa</button>
              </div>
            )}
          />
        </section>

        <div className="marketplace-detail-body">
          <div className="marketplace-detail-sections">{children}</div>
          <aside className="marketplace-detail-contact-panel">{contactPanel}</aside>
        </div>
        {footer}
      </div>
      {isMediaOpen && createPortal(
        <div
          className="marketplace-detail-media-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos y mapa de ${title}`}
          onClick={(event) => { if (event.target === event.currentTarget) closeMedia() }}
          tabIndex={-1}
        >
          <button type="button" className="marketplace-detail-media-close" onClick={closeMedia} aria-label="Cerrar fotos y mapa">
            <X size={22} aria-hidden="true" />
          </button>
          <div className="marketplace-detail-media-tabs" role="tablist" aria-label="Contenido del anuncio">
            <button type="button" role="tab" aria-selected={mediaTab === 'photos'} onClick={() => setMediaTab('photos')}>Fotos</button>
            <button type="button" role="tab" aria-selected={mediaTab === 'map'} onClick={() => setMediaTab('map')}>Mapa</button>
          </div>
          {mediaTab === 'photos' ? (
            <CatalogCardGallery
              images={images}
              label={imageLabel}
              eager
              fallback={imageFallback}
              renderImage={renderImage}
              mediaClassName="property-photo marketplace-detail-modal-gallery"
              activeIndex={activeImageIndex}
              onActiveIndexChange={updateActiveImageIndex}
            />
          ) : (
            <section className="marketplace-detail-modal-map" aria-label={mapLabel}>
              {mapContent}
            </section>
          )}
        </div>,
        document.body,
      )}
    </main>
  )
}
