import { lazy, Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin } from 'lucide-react'
import { MarketplaceMapCloseAction } from '../marketplace/MarketplaceMapToggle'
import { Button } from '../../shared/ui/button'
import type { Property } from '../properties/types'
import type { ProvinceCount } from '../marketplace/provinceAggregates'
import { ProvinceMapStatus } from '../marketplace/ProvinceMapStatus'
import type { MapAdapterProps } from '../maps/types'
import type { CatalogMapListing } from '../maps/types'

const PropertyMap = lazy(() => import('../maps/components/PropertyMap').then((module) => ({ default: module.PropertyMap })))
const MapLibreAdapter = lazy(() => import('../maps/adapters/MapLibreAdapter').then((module) => ({ default: module.MapLibreAdapter })))
const ProvinceAggregateMap = lazy(() => import('../marketplace/ProvinceAggregateMap').then((module) => ({ default: module.ProvinceAggregateMap })))

type PropertyCatalogMapProps = {
  mode: 'properties'
  properties: Property[]
  selectedPropertyId?: string
  onSelectProperty: MapAdapterProps['onSelectProperty']
  onSelectCluster?: MapAdapterProps['onSelectCluster']
  onViewportChange?: MapAdapterProps['onViewportChange']
}

type ProvinceCatalogMapProps = {
  mode: 'province-counts'
  counts: ProvinceCount[]
  selectedProvince: string
  onSelectProvince: (province: string) => void
  onClose: () => void
  accent?: string
  resultLabel?: string
}

type ListingCatalogMapProps = {
  mode: 'listings'
  listings: CatalogMapListing[]
  selectedListingId?: string
  selectedListingIds?: string[]
  listingLabel: string
  onSelectListing: (listingId: string) => void
  onSelectCluster: (listingIds: string[]) => void
  onViewportChange: (listingIds: string[]) => void
  onClose: () => void
}

export type CatalogMapProps = PropertyCatalogMapProps | ProvinceCatalogMapProps | ListingCatalogMapProps

/** Single map entry point for every catalog; data/interaction mode is explicit. */
export function CatalogMap(props: CatalogMapProps) {
  return (
    <Suspense fallback={props.mode === 'province-counts'
      ? <ProvinceMapStatus onClose={props.onClose} resultLabel={props.resultLabel ?? 'resultados'} />
      : <div className="map-card map-loading-state" role="status">Cargando mapa…</div>}>
      {props.mode === 'properties' ? (
        <PropertyMap
          properties={props.properties}
          selectedPropertyId={props.selectedPropertyId}
          onSelectProperty={props.onSelectProperty}
          onSelectCluster={props.onSelectCluster}
          onViewportChange={props.onViewportChange}
        />
      ) : props.mode === 'listings' ? (
        <ResponsiveCatalogListingMap
          {...props}
        />
      ) : (
        <ProvinceAggregateMap
          counts={props.counts}
          selectedProvince={props.selectedProvince}
          onSelectProvince={props.onSelectProvince}
          onClose={props.onClose}
          accent={props.accent}
          resultLabel={props.resultLabel}
        />
      )}
    </Suspense>
  )
}

function ResponsiveCatalogListingMap(props: ListingCatalogMapProps) {
  const [isDesktopMap, setIsDesktopMap] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1021px)').matches)
  const onClose = props.onClose

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1021px)')
    const update = () => setIsDesktopMap(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (isDesktopMap) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDesktopMap, onClose])

  const panel = (
    <section
      className={`marketplace-catalog-points-map z-[9999] flex min-h-0 flex-col overflow-hidden border border-neutral-200 bg-white ${isDesktopMap ? 'sticky top-4 h-[calc(100dvh-2rem)] rounded-2xl' : 'fixed inset-0 h-[100dvh] w-full border-0 pt-[env(safe-area-inset-top)]'}`}
      role={isDesktopMap ? undefined : 'dialog'}
      aria-modal={isDesktopMap ? undefined : true}
      aria-label={`Mapa de ${props.listingLabel}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-neutral-900"><MapPin size={18} aria-hidden="true" />Mapa de {props.listingLabel}</h2>
          <p className="text-sm text-neutral-600">Explora ubicaciones aproximadas; mueve el mapa para filtrar los resultados.</p>
        </div>
        <Button type="button" variant="outline" className="hidden min-h-11 sm:inline-flex" onClick={props.onClose}>Cerrar mapa</Button>
      </div>
      <div className="relative min-h-[300px] flex-1">
        <MapLibreAdapter
          properties={[]}
          listings={props.listings}
          listingLabel={props.listingLabel}
          selectedPropertyId={props.selectedListingId}
          selectedPropertyIds={props.selectedListingIds}
          onSelectProperty={props.onSelectListing}
          onSelectCluster={props.onSelectCluster}
          onViewportChange={props.onViewportChange}
        />
      </div>
      {!isDesktopMap && <MarketplaceMapCloseAction onClose={props.onClose} />}
    </section>
  )

  return !isDesktopMap && typeof document !== 'undefined' ? createPortal(panel, document.body) : panel
}
