import { Map } from 'lucide-react'
import { Button } from '../../shared/ui/button'

type MarketplaceMapToggleProps = {
  open: boolean
  mapId: string
  onToggle: () => void
}

export function MarketplaceMapToggle({ open, mapId, onToggle }: MarketplaceMapToggleProps) {
  return (
    <div className="marketplace-map-floating-actions" aria-label="Acciones del mapa">
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
}
