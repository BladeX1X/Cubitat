export type MapErrorResource = 'vector_tiles' | 'raster_tiles' | 'property_data' | 'other'

export function classifyMapErrorResource(sourceId: unknown): MapErrorResource {
  if (sourceId === 'openmaptiles') return 'vector_tiles'
  if (sourceId === 'ne2_shaded') return 'raster_tiles'
  if (sourceId === 'cubitat-properties') return 'property_data'
  return 'other'
}

/** Returns a closed, non-sensitive error code suitable for browser logging. */
export function classifyMapError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'MAPLIBRE_RESOURCE_ERROR'

  const value = error as Record<string, unknown>
  const status = value.status
  if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
    return `HTTP_STATUS_${status}`
  }

  const message = typeof value.message === 'string' ? value.message.toLowerCase() : ''
  if (message.includes('webgl') && message.includes('context')) {
    return 'MAPLIBRE_WEBGL_CONTEXT_LOST'
  }
  if (message.includes('glyph') || message.includes('font')) {
    return 'MAPLIBRE_GLYPH_LOAD_ERROR'
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return 'MAPLIBRE_NETWORK_ERROR'
  }
  if (message.includes('tile') || message.includes('.pbf')) {
    return 'MAPLIBRE_TILE_LOAD_ERROR'
  }

  return 'MAPLIBRE_RESOURCE_ERROR'
}
