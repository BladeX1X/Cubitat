import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStyle: vi.fn(),
  marker: vi.fn(),
  map: {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: vi.fn(function MockMap() { return mocks.map }),
  Marker: mocks.marker,
  NavigationControl: vi.fn(),
  AttributionControl: vi.fn(),
}))

vi.mock('../maps/lib/openFreeMapStyle', () => ({
  getOpenFreeMapStyle: mocks.getStyle,
}))

import MarketplaceDetailMapCanvas from './MarketplaceDetailMapCanvas'

describe('MarketplaceDetailMapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
  })

  it('renders the approximate area without a location pin', async () => {
    render(<MarketplaceDetailMapCanvas center={[-82.36, 23.12]} listingId="listing-a" locationLabel="La Habana" showApproximateArea />)

    await waitFor(() => expect(mocks.map.once).toHaveBeenCalledWith('load', expect.any(Function)))
    const loadHandler = mocks.map.once.mock.calls.find(([event]) => event === 'load')?.[1]
    await act(async () => (loadHandler as () => void)())

    await waitFor(() => expect(mocks.map.addSource).toHaveBeenCalledWith(
      'approximate-location-radius',
      expect.objectContaining({ type: 'geojson' }),
    ))
    expect(mocks.map.addLayer).toHaveBeenCalledTimes(2)
    expect(mocks.marker).not.toHaveBeenCalled()
  })
})
