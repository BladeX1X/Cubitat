import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Property } from '../properties/types'

const mapMock = vi.hoisted(() => ({
  selectedPropertyIds: [] as string[],
}))

vi.mock('../maps/components/PropertyMap', () => ({
  PropertyMap: ({ onSelectCluster, onViewportChange, selectedPropertyIds }: {
    onSelectCluster?: (ids: string[]) => void
    onViewportChange?: (ids: string[]) => void
    selectedPropertyIds?: string[]
  }) => {
    mapMock.selectedPropertyIds = selectedPropertyIds ?? []
    return <div>
      <button type="button" onClick={() => onSelectCluster?.(Array.from({ length: 9 }, (_, index) => `property-${index + 1}`))}>Seleccionar grupo de 9</button>
      <button type="button" onClick={() => onViewportChange?.(['property-1', 'property-2', 'property-3', 'property-4'])}>Acercar y dividir en 4 + 5</button>
      <output data-testid="mobile-selected-map-ids">{selectedPropertyIds?.join(',') ?? ''}</output>
    </div>
  },
}))

vi.mock('../search/components/FilterBar', () => ({
  FilterBar: () => null,
}))

vi.mock('../properties/components/SavePropertyButton', () => ({
  SavePropertyButton: () => null,
}))

import { ResultsMapView } from './ResultsMapView'

const properties: Property[] = Array.from({ length: 9 }, (_, index) => ({
  id: `property-${index + 1}`,
  title: `Casa ${index + 1}`,
  location: 'La Habana',
  description: '',
  zoneId: 'habana',
  operation: 'venta',
  propertyType: 'casa',
  priceUsd: 50_000,
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  areaM2: 80,
  amenities: [],
  status: 'published',
  coverTone: '',
  coverImage: '',
  mapPoint: { x: 0, y: 0 },
  coordinates: { latitude: 23.1, longitude: -82.3 },
}))

describe('ResultsMapView mobile selection', () => {
  beforeEach(() => {
    mapMock.selectedPropertyIds = []
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
  })

  it('keeps all selected properties highlighted when a mobile cluster splits on zoom', () => {
    render(<ResultsMapView
      viewMode="map"
      onViewModeChange={vi.fn()}
      properties={properties}
      onSelectProperty={vi.fn()}
      filterBarProps={{} as never}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar grupo de 9' }))
    const selectedIds = Array.from({ length: 9 }, (_, index) => `property-${index + 1}`).join(',')

    expect(screen.getByTestId('mobile-selected-map-ids')).toHaveTextContent(selectedIds)
    expect(screen.getByLabelText('Vista de mapa')).toHaveAttribute('aria-label', 'Vista de mapa')

    fireEvent.click(screen.getByRole('button', { name: 'Acercar y dividir en 4 + 5' }))

    expect(screen.getByTestId('mobile-selected-map-ids')).toHaveTextContent(selectedIds)
    expect(screen.getByLabelText('9 propiedades')).toBeInTheDocument()
  })
})
