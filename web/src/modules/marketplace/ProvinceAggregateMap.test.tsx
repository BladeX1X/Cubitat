import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProvinceCount } from './provinceAggregates'
import type { ProvinceMapFeatureLike } from './provinceMapInteractions'

const mocks = vi.hoisted(() => ({
  getStyle: vi.fn(),
  map: {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn(),
    fitBounds: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
    getLayer: vi.fn(() => true),
    getSource: vi.fn(() => ({ setData: vi.fn(), getClusterExpansionZoom: vi.fn().mockResolvedValue(7) })),
    queryRenderedFeatures: vi.fn((): ProvinceMapFeatureLike[] => []),
    resize: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    easeTo: vi.fn(),
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
    expect(mocks.map.resize).toHaveBeenCalledOnce()
    expect(mocks.map.fitBounds).toHaveBeenCalledWith([[-85.1, 19.5], [-73.5, 23.5]], { padding: 28, maxZoom: 5.8, duration: 0 })
    expect(mocks.map.setPaintProperty).toHaveBeenCalledWith(
      'cubitat-marketplace-province-points',
      'circle-radius',
      ['case', ['==', ['get', 'province'], ''], 28, 24],
    )
  })

  it('applies a province selection from a tap on the mobile map', async () => {
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const onSelectProvince = vi.fn()

    render(<ProvinceAggregateMap counts={counts} selectedProvince="" onSelectProvince={onSelectProvince} onClose={vi.fn()} />)
    await waitFor(() => expect(mocks.map.once).toHaveBeenCalledWith('style.load', expect.any(Function)))
    const styleLoadHandler = mocks.map.once.mock.calls.find(([event]) => event === 'style.load')?.[1]
    await act(async () => (styleLoadHandler as () => void)())
    await waitFor(() => expect(screen.queryByText('Cargando mapa…')).not.toBeInTheDocument())

    mocks.map.queryRenderedFeatures.mockReturnValue([{
      properties: { province: 'La Habana', count: 3 },
      geometry: { type: 'Point', coordinates: [-82.36, 23.1] },
    }])
    const clickHandler = mocks.map.on.mock.calls.find(([event]) => event === 'click')?.[1]
    expect(clickHandler).toEqual(expect.any(Function))

    act(() => (clickHandler as (event: { point: { x: number; y: number } }) => void)({ point: { x: 20, y: 30 } }))

    expect(onSelectProvince).toHaveBeenCalledWith('La Habana')
    expect(screen.getByRole('button', { name: 'Ocultar mapa' })).toBeInTheDocument()
  })

  it('closes the full-screen mobile map from its floating bottom action', async () => {
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const onClose = vi.fn()
    render(<ProvinceAggregateMap counts={counts} selectedProvince="" onSelectProvince={vi.fn()} onClose={onClose} />)

    expect(document.body.querySelector('.marketplace-province-map')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Ocultar mapa' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('zooms into a tapped group, then filters when the province marker is tapped', async () => {
    mocks.getStyle.mockResolvedValue({ version: 8, sources: {}, layers: [] })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const onSelectProvince = vi.fn()
    render(<ProvinceAggregateMap counts={counts} selectedProvince="" onSelectProvince={onSelectProvince} onClose={vi.fn()} />)
    await waitFor(() => expect(mocks.map.once).toHaveBeenCalledWith('style.load', expect.any(Function)))
    const styleLoadHandler = mocks.map.once.mock.calls.find(([event]) => event === 'style.load')?.[1]
    await act(async () => (styleLoadHandler as () => void)())
    await waitFor(() => expect(screen.queryByText('Cargando mapa…')).not.toBeInTheDocument())

    mocks.map.queryRenderedFeatures
      .mockReturnValueOnce([{
        properties: { cluster_id: 42, point_count: 2 },
        geometry: { type: 'Point', coordinates: [-80, 22] },
      }])
      .mockReturnValueOnce([{
        properties: { province: 'La Habana', count: 3 },
        geometry: { type: 'Point', coordinates: [-82.36, 23.1] },
      }])
    const clickHandler = mocks.map.on.mock.calls.find(([event]) => event === 'click')?.[1]
    const click = (x: number) => act(() => (clickHandler as (event: { point: { x: number; y: number } }) => void)({ point: { x, y: 30 } }))

    click(20)
    await waitFor(() => expect(mocks.map.easeTo).toHaveBeenCalledWith({ center: [-80, 22], zoom: 7 }))
    expect(onSelectProvince).not.toHaveBeenCalled()

    click(21)
    expect(onSelectProvince).toHaveBeenCalledWith('La Habana')
  })
})
