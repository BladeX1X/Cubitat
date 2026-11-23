import { useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { fetchMarketplaceContact, getMarketplaceContactUrl, type MarketplaceListingType } from '../lib/marketplaceContact'
import { Button } from './button'

type MarketplaceContactActionsProps = {
  listingId: string
  listingType: MarketplaceListingType
  listingTitle: string
  listingLocation: string
  onMissing?: () => void
  onChannelOpen?: (channel: 'phone' | 'whatsapp') => void
  layout?: 'card' | 'detail' | 'property-hero' | 'property-mobile'
}

/** Opens a seller's phone or WhatsApp only after an explicit channel click. */
export function MarketplaceContactActions({
  listingId,
  listingType,
  listingTitle,
  listingLocation,
  onMissing,
  onChannelOpen,
  layout = 'detail',
}: MarketplaceContactActionsProps) {
  const isPropertyCard = layout === 'card' && listingType === 'property'
  const isPropertyHero = layout === 'property-hero'
  const isPropertyMobile = layout === 'property-mobile'
  const [loadingChannel, setLoadingChannel] = useState<'phone' | 'whatsapp' | null>(null)
  const [error, setError] = useState<'missing' | 'phone-missing' | 'whatsapp-missing' | 'unavailable' | null>(null)
  const [blockedWhatsAppUrl, setBlockedWhatsAppUrl] = useState<string | null>(null)

  async function openChannel(channel: 'phone' | 'whatsapp') {
    if (loadingChannel) return
    setError(null)
    setBlockedWhatsAppUrl(null)
    setLoadingChannel(channel)
    try {
      const contact = await fetchMarketplaceContact(listingType, listingId)
      const phone = channel === 'phone' ? contact.phone : contact.whatsapp
      if (!phone) {
        if (isPropertyMobile) {
          onMissing?.()
          return
        }
        setError(channel === 'phone' ? 'phone-missing' : 'whatsapp-missing')
        return
      }
      const url = getMarketplaceContactUrl(channel, phone, listingTitle, listingLocation)
      if (!url) {
        setError('unavailable')
        return
      }
      onChannelOpen?.(channel)
      if (channel === 'phone') window.location.assign(url)
      else {
        // Only open WhatsApp after the protected lookup confirms a real number.
        // A missing number must never flash an empty browser tab.
        const whatsappWindow = window.open(url, '_blank')
        if (whatsappWindow) {
          try { whatsappWindow.opener = null } catch { /* Browser window proxies may expose a read-only opener. */ }
        } else {
          setBlockedWhatsAppUrl(url)
        }
      }
    } catch (cause) {
      const reason = typeof cause === 'object' && cause !== null && 'reason' in cause
        && (cause.reason === 'missing' || cause.reason === 'unavailable')
        ? cause.reason
        : 'unavailable'
      setError(reason)
    } finally {
      setLoadingChannel(null)
    }
  }

  const buttonClass = isPropertyCard
    ? 'property-contact-btn min-h-11'
    : isPropertyHero ? 'detail-desktop-primary-cta'
      : isPropertyMobile ? 'mobile-detail-cta-icon'
        : layout === 'card' ? 'min-h-11 w-full' : 'min-h-11'
  return (
    <div className={isPropertyCard ? 'property-actions' : isPropertyHero ? 'detail-desktop-cta-row' : isPropertyMobile ? 'contents' : layout === 'card' ? 'marketplace-contact-actions border-t border-neutral-100 p-4' : 'mt-6'}>
      <div className={isPropertyCard || isPropertyHero || isPropertyMobile ? 'contents' : layout === 'card' ? 'marketplace-contact-actions__buttons grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2'}>
        <Button type="button" variant="outline" className={buttonClass} aria-label={isPropertyMobile ? 'Llamar al anunciante' : undefined} disabled={loadingChannel !== null} onClick={(event) => { event.stopPropagation(); void openChannel('phone') }}>
          <Phone aria-hidden="true" />{isPropertyMobile ? <span className="sr-only">Contactar</span> : loadingChannel === 'phone' ? 'Abriendo…' : 'Contactar'}
        </Button>
        <Button type="button" className={isPropertyCard ? 'property-whatsapp-btn min-h-11' : isPropertyHero ? 'detail-desktop-secondary-cta' : isPropertyMobile ? 'mobile-detail-cta-primary' : buttonClass} disabled={loadingChannel !== null} onClick={(event) => { event.stopPropagation(); void openChannel('whatsapp') }}>
          <MessageCircle aria-hidden="true" />{isPropertyMobile ? 'Consultar' : loadingChannel === 'whatsapp' ? 'Abriendo…' : 'Consultar'}
        </Button>
      </div>
      {(error === 'missing' || error === 'phone-missing' || error === 'whatsapp-missing') && <div className="mt-2 space-y-1 text-xs text-amber-900"><p role="status">{error === 'phone-missing' ? 'El anunciante no ha asociado un teléfono a este anuncio.' : error === 'whatsapp-missing' ? 'El anunciante no ha asociado WhatsApp a este anuncio.' : 'El anunciante no ha añadido teléfono ni WhatsApp a este anuncio.'}</p>{onMissing && <button type="button" className="font-semibold underline" onClick={onMissing}>Abrir anuncio y enviar una consulta</button>}</div>}
      {error === 'unavailable' && <p role="alert" className="mt-2 text-xs text-red-700">No se pudo abrir el contacto. Inténtalo de nuevo en unos momentos.</p>}
      {blockedWhatsAppUrl && <p role="status" className="mt-2 text-xs text-amber-900">El navegador bloqueó la pestaña. <a className="font-semibold underline" href={blockedWhatsAppUrl} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></p>}
    </div>
  )
}
