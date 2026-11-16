import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useSavedMarketplaceListings, type SavedMarketplaceListingType } from '../../modules/marketplace/hooks/useSavedMarketplaceListings'

type SaveMarketplaceListingButtonProps = {
  listingType: SavedMarketplaceListingType
  listingId: string
  listingTitle: string
  className?: string
  iconSize?: number
  showLabel?: boolean
}

export function SaveMarketplaceListingButton({
  listingType,
  listingId,
  listingTitle,
  className = 'property-save',
  iconSize = 19,
  showLabel = false,
}: SaveMarketplaceListingButtonProps) {
  const { isSaved, isPending, toggleSave } = useSavedMarketplaceListings()
  const [actionFailed, setActionFailed] = useState(false)
  const saved = isSaved(listingType, listingId)
  const pending = isPending(listingType, listingId)
  const label = saved ? `Quitar ${listingTitle} de favoritos` : `Guardar ${listingTitle} en favoritos`

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        aria-pressed={saved}
        title={label}
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setActionFailed(false)
          void toggleSave(listingType, listingId).then((success) => {
            setActionFailed(!success)
          }).catch(() => {
            setActionFailed(true)
          })
        }}
      >
        <Heart size={iconSize} className={saved ? 'fill-red-500 text-red-500' : ''} aria-hidden="true" />
        {showLabel && <span>{saved ? 'Guardado' : 'Guardar'}</span>}
      </button>
      {actionFailed && (
        <span
          role="alert"
          className="absolute right-2 top-[62px] z-20 max-w-[min(15rem,calc(100vw-2rem))] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-red-700 shadow-lg"
        >
          No se pudo actualizar el favorito. Comprueba tu conexión e inténtalo de nuevo.
        </span>
      )}
    </>
  )
}
