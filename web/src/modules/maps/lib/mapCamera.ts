export function shouldFitInitialBounds(hasFittedInitialBounds: boolean, boundsAreEmpty: boolean): boolean {
  return !hasFittedInitialBounds && !boundsAreEmpty
}

export function shouldRecenterSelection(
  selectedCoordinates: readonly [number, number][],
  contains: (coordinate: [number, number]) => boolean,
): boolean {
  return selectedCoordinates.some((coordinate) => !contains(coordinate))
}

export interface MapSelectionPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export function getSelectionPadding(
  overlayInsets: Partial<MapSelectionPadding> = {},
): MapSelectionPadding {
  return {
    top: Math.max(56, (overlayInsets.top ?? 0) + 36),
    right: Math.max(56, (overlayInsets.right ?? 0) + 28),
    bottom: Math.max(220, (overlayInsets.bottom ?? 0) + 36),
    left: Math.max(56, (overlayInsets.left ?? 0) + 28),
  }
}

export function isPointInsideSelectionViewport(
  point: { x: number; y: number },
  viewport: { width: number; height: number },
  padding: MapSelectionPadding,
  markerRadius = 28,
): boolean {
  return point.x >= padding.left + markerRadius
    && point.x <= viewport.width - padding.right - markerRadius
    && point.y >= padding.top + markerRadius
    && point.y <= viewport.height - padding.bottom - markerRadius
}
