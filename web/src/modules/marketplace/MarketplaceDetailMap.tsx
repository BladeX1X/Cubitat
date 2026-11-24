import { lazy, Suspense } from 'react'

const MarketplaceDetailMapCanvas = lazy(() => import('./MarketplaceDetailMapCanvas'))

type MarketplaceDetailMapProps = {
  center: [number, number] | null
  locationLabel: string
}

export function MarketplaceDetailMap({ center, locationLabel }: MarketplaceDetailMapProps) {
  return (
    <Suspense fallback={<div role="status" className="flex h-full items-center justify-center bg-neutral-100 text-sm text-neutral-600">Cargando mapa…</div>}>
      <MarketplaceDetailMapCanvas center={center} locationLabel={locationLabel} />
    </Suspense>
  )
}
