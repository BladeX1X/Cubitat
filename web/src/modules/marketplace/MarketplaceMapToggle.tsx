import { List, Map } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '../../shared/ui/button'

type MarketplaceMapToggleProps = {
  open: boolean
  mapId: string
  onToggle: () => void
  className?: string
}

export function MarketplaceMapToggle({ open, mapId, onToggle, className = '' }: MarketplaceMapToggleProps) {
  const actions = (
    <div className={`marketplace-map-floating-actions ${className}`.trim()} aria-label="Acciones del mapa">
      <Button
        type="button"
        variant="secondary"
        className="marketplace-map-floating-toggle"
        aria-expanded={open}
        aria-controls={open ? mapId : undefined}
        onClick={onToggle}
      >
        <Map size={16} aria-hidden="true" />
        {open ? 'Ocultar mapa' : 'Mostrar mapa'}
      </Button>
    </div>
  )
  return typeof document === 'undefined' ? actions : createPortal(actions, document.body)
}

export function MarketplaceMapCloseAction({ onClose }: { onClose: () => void }) {
  return (
    <div className="marketplace-map-bottom-actions">
      <Button type="button" variant="secondary" className="marketplace-map-floating-toggle" onClick={onClose}>
        <List size={16} aria-hidden="true" />
        Ocultar mapa
      </Button>
    </div>
  )
}
