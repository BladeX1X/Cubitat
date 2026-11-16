import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProvinceCount } from './provinceAggregates'

const mocks = vi.hoisted(() => ({
  getStyle: vi.fn(),
  map: {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
    getLayer: vi.fn(() => true),
    getSource: vi.fn(() => ({ setData: vi.fn() })),
    on: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
    setLayoutProperty: vi.fn(),
    setPaintProperty: vi.fn(),
  },
}))

vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: vi.fn(function MockMap() { return mocks.map }),
  NavigationControl: vi.fn(),
  AttributionControl: vi.fn(),
}))

vi.mock('../maps/lib/openFreeMapStyle', () => ({
  getOpenFreeMapStyle: mocks.getStyle,
}))

import { ProvinceAggregateMap } from './ProvinceAggregateMap'

const counts: ProvinceCount[] = [{ province: 'La Habana', count: 3 }]

describe('ProvinceAggregateMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 1021px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('retries loading the map style after an initial network failure', async () => {
    mocks.getStyle.mockRejectedValueOnce(new Error('network unavailable')).mockImplementationOnce(() => new Promise(() => undefined))

    render(<ProvinceAggregateMap counts={counts} selectedProvince="" onSelectProvince={vi.fn()} onClose={vi.fn()} />)

    const retryButton = await screen.findByRole('button', { name: 'Reintentar mapa' })
    fireEvent.click(retryButton)

    await waitFor(() => expect(mocks.getStyle).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reintentar mapa' })).not.toBeInTheDocument())
    expect(screen.getByText('Cargando mapa…')).toBeInTheDocument()
  })

  it('reveals the map after its style loads without waiting for every map tile', async () => {
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })

    render(<ProvinceAggregateMap counts={counts} selectedProvince="" onSelectProvince={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => expect(mocks.map.once).toHaveBeenCalledWith('style.load', expect.any(Function)))
    expect(screen.getByText('Cargando mapa…')).toBeInTheDocument()

    const styleLoadHandler = mocks.map.once.mock.calls.find(([event]) => event === 'style.load')?.[1]
    expect(styleLoadHandler).toEqual(expect.any(Function))
    await act(async () => (styleLoadHandler as () => void)())

    await waitFor(() => expect(screen.queryByText('Cargando mapa…')).not.toBeInTheDocument())
    expect(mocks.map.addSource).toHaveBeenCalled()
    expect(mocks.map.addLayer).toHaveBeenCalled()
  })
})
