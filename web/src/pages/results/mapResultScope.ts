export type MapResultScope = {
  propertyIds: string[] | null
  source: 'viewport' | 'selection'
}

export const EMPTY_MAP_RESULT_SCOPE: MapResultScope = {
  propertyIds: null,
  source: 'viewport',
}

export function selectMapResultGroup(propertyIds: string[]): MapResultScope {
  return { propertyIds, source: 'selection' }
}

export function updateMapViewportResults(
  scope: MapResultScope,
  propertyIds: string[],
): MapResultScope {
  if (scope.source === 'selection') return scope
  return { propertyIds, source: 'viewport' }
}
