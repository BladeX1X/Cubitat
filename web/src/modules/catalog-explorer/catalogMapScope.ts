export type CatalogMapScope = { listingIds: string[] | null; source: 'viewport' | 'selection' }

export const EMPTY_CATALOG_MAP_SCOPE: CatalogMapScope = { listingIds: null, source: 'viewport' }

export function selectCatalogMapGroup(listingIds: string[]): CatalogMapScope {
  return { listingIds, source: 'selection' }
}

export function updateCatalogMapViewport(scope: CatalogMapScope, listingIds: string[]): CatalogMapScope {
  return scope.source === 'selection' ? scope : { listingIds, source: 'viewport' }
}
