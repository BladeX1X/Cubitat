import type { ReactNode } from 'react'

export type CatalogExplorerLayoutProps = {
  children: ReactNode
  toolbar?: ReactNode
  map?: ReactNode
  mapOpen?: boolean
  className?: string
  catalogClassName?: string
  mapClassName?: string
  mapId?: string
  mapBusy?: boolean
}

/** Shared list/map frame. Filters and cards remain domain-owned slots. */
export function CatalogExplorerLayout({
  children,
  toolbar,
  map,
  mapOpen = false,
  className = '',
  catalogClassName = '',
  mapClassName = '',
  mapId,
  mapBusy,
}: CatalogExplorerLayoutProps) {
  return (
    <div className={`${className}${mapOpen ? ' is-map-open' : ''}`.trim()}>
      {toolbar}
      <div className={catalogClassName || undefined}>{children}</div>
      {mapOpen && map ? (
        <div id={mapId} className={mapClassName || undefined} aria-busy={mapBusy}>
          {map}
        </div>
      ) : null}
    </div>
  )
}
