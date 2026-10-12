import { describe, expect, it } from 'vitest'
import { classifyMapError, classifyMapErrorResource } from './mapErrorDiagnostics'

describe('MapLibre error diagnostics', () => {
  it('classifies map resource categories without exposing source identifiers', () => {
    expect(classifyMapErrorResource('openmaptiles')).toBe('vector_tiles')
    expect(classifyMapErrorResource('ne2_shaded')).toBe('raster_tiles')
    expect(classifyMapErrorResource('cubitat-properties')).toBe('property_data')
    expect(classifyMapErrorResource('unknown-source')).toBe('other')
  })

  it('returns only closed safe codes for common tile and rendering failures', () => {
    expect(classifyMapError({ status: 503, message: 'https://tiles.example/secret-url' }))
      .toBe('HTTP_STATUS_503')
    expect(classifyMapError(new Error('Failed to load glyph range from private URL')))
      .toBe('MAPLIBRE_GLYPH_LOAD_ERROR')
    expect(classifyMapError(new Error('WebGL context lost'))).toBe('MAPLIBRE_WEBGL_CONTEXT_LOST')
    expect(classifyMapError(new Error('Failed to fetch resource'))).toBe('MAPLIBRE_NETWORK_ERROR')
    expect(classifyMapError(new Error('arbitrary private details'))).toBe('MAPLIBRE_RESOURCE_ERROR')
  })
})
