import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStyle: vi.fn(),
  map: {
    addControl: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
    off: vi.fn(),
    resize: vi.fn(),
  },
}))

vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: vi.fn(function MockMap() { return mocks.map }),
  NavigationControl: vi.fn(),
  AttributionControl: vi.fn(),
}))

vi.mock('../lib/openFreeMapStyle', () => ({ getOpenFreeMapStyle: mocks.getStyle }))

import { useMapLibreMap } from './useMapLibreMap'

describe('useMapLibreMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shares map construction, controls, style readiness, and resize observation', async () => {
    const element = document.createElement('div')
    const resizeCallbacks: Array<() => void> = []
    class MockResizeObserver {
      constructor(callback: () => void) { resizeCallbacks.push(callback) }
      observe = vi.fn()
      disconnect = vi.fn()
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    const ref = { current: element }
    const { result, unmount } = renderHook(() => useMapLibreMap(ref, {
      center: [-79.5, 21.8], zoom: 5.15, minZoom: 4, maxZoom: 11,
    }))

    await waitFor(() => expect(mocks.map.once).toHaveBeenCalledWith('style.load', expect.any(Function)))
    expect(result.current.status).toBe('loading')
    expect(mocks.map.addControl).toHaveBeenCalledTimes(2)

    const styleLoad = mocks.map.once.mock.calls.find(([event]) => event === 'style.load')?.[1] as (() => void) | undefined
    act(() => styleLoad?.())
    expect(result.current.status).toBe('ready')

    act(() => resizeCallbacks[0]?.())
    expect(mocks.map.resize).toHaveBeenCalled()

    unmount()
    expect(mocks.map.remove).toHaveBeenCalledOnce()
  })

  it('exposes load errors and rebuilds the map when retried', async () => {
    mocks.getStyle.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ version: 8, sources: {}, layers: [] })
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => useMapLibreMap(ref, {
      center: [-79.5, 21.8], zoom: 5.15, minZoom: 4, maxZoom: 11,
    }))

    await waitFor(() => expect(result.current.status).toBe('error'))
    act(() => result.current.retry())
    await waitFor(() => expect(mocks.getStyle).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.map.once).toHaveBeenCalledWith('style.load', expect.any(Function)))
    expect(result.current.status).toBe('loading')
  })
})
