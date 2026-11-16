import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getStyle: vi.fn(), emitLoad: true, mapInstance: null as unknown, logSafeEvent: vi.fn() }))
type MockMapHandler = (payload?: unknown) => void

vi.mock('maplibre-gl', () => {
  class MockMap {
    handlers = new Map<string, MockMapHandler>()
    on(event: string, handler: MockMapHandler) {
      if (event === 'load' && mocks.emitLoad) queueMicrotask(handler)
      else this.handlers.set(event, handler)
      return this
    }
    addControl() { return this }
    flyTo() { return this }
    remove() { return this }
    constructor() { mocks.mapInstance = this }
  }
  class MockMarker {
    setLngLat() { return this }
    addTo() { return this }
    on() { return this }
    remove() { return this }
  }
  class MockControl {}
  return { Map: MockMap, Marker: MockMarker, NavigationControl: MockControl, setWorkerUrl: vi.fn() }
})

vi.mock('../lib/openFreeMapStyle', () => ({ getOpenFreeMapStyle: mocks.getStyle }))
vi.mock('../../../shared/lib/logger', () => ({
  logSafeEvent: mocks.logSafeEvent,
  sanitizeErrorReason: vi.fn(() => 'UNHANDLED_EXCEPTION'),
}))

import { AddressMap } from './AddressMap'

const props = { province: 'La Habana', municipality: 'Playa', latitude: null, longitude: null, onCoordinatesChange: vi.fn() }

describe('AddressMap recovery', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mocks.emitLoad = true
    mocks.mapInstance = null
    mocks.logSafeEvent.mockClear()
  })

  it('shows a recoverable error and retries after the map style request fails', async () => {
    mocks.getStyle.mockRejectedValueOnce(new Error('style unavailable')).mockResolvedValueOnce({ version: 8, sources: {}, layers: [] })
    render(<AddressMap {...props} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }))

    await waitFor(() => expect(mocks.getStyle).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(mocks.mapInstance).not.toBeNull()
  })

  it('stops showing an endless loading state when the map never emits load', async () => {
    vi.useFakeTimers()
    mocks.emitLoad = false
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    render(<AddressMap {...props} />)

    await act(async () => {
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(15_000)
    })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el mapa')
    expect(screen.getByRole('button', { name: 'Reintentar mapa' })).toBeInTheDocument()
  })

  it('shows recovery after a fatal MapLibre error before initial load', async () => {
    mocks.emitLoad = false
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    render(<AddressMap {...props} />)

    await waitFor(() => expect(mocks.mapInstance).not.toBeNull())
    const failedMap = mocks.mapInstance as { handlers: Map<string, MockMapHandler> }
    act(() => failedMap.handlers.get('error')?.({ error: new Error('style initialization failed') }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa')
    expect(screen.getByRole('button', { name: 'Reintentar mapa' })).toBeInTheDocument()
  })

  it('does not treat an isolated tile error as fatal while the initial map can still load', async () => {
    mocks.emitLoad = false
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    render(<AddressMap {...props} />)

    await waitFor(() => expect(mocks.mapInstance).not.toBeNull())
    const loadingMap = mocks.mapInstance as { handlers: Map<string, MockMapHandler> }
    act(() => loadingMap.handlers.get('error')?.({
      error: new Error('tile fetch failed'),
      sourceId: 'openmaptiles',
    }))

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mocks.logSafeEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'maplibre_resource',
      code: 'MAPLIBRE_NETWORK_ERROR',
      context: { resource: 'vector_tiles' },
    }))

    act(() => loadingMap.handlers.get('load')?.())
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('keeps an already loaded map after an isolated tile error and logs the safe category once', async () => {
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    render(<AddressMap {...props} />)

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    const loadedMap = mocks.mapInstance as { handlers: Map<string, MockMapHandler> }
    const logCountBeforeError = mocks.logSafeEvent.mock.calls.length
    const tileError = { error: new Error('Failed to load tile at https://private.example/path'), sourceId: 'openmaptiles' }
    act(() => {
      loadedMap.handlers.get('error')?.(tileError)
      loadedMap.handlers.get('error')?.(tileError)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mocks.mapInstance).toBe(loadedMap)
    expect(mocks.logSafeEvent).toHaveBeenCalledTimes(logCountBeforeError + 1)
    expect(mocks.logSafeEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'maplibre_resource',
      code: 'MAPLIBRE_TILE_LOAD_ERROR',
      context: { resource: 'vector_tiles' },
    }))
    expect(JSON.stringify(mocks.logSafeEvent.mock.calls)).not.toContain('private.example')
  })
})
