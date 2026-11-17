import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'

vi.mock('../../modules/properties/hooks/useSavedProperties', () => ({
  useSavedProperties: () => ({ savedPropertyIds: new Set<string>(), loading: false, isSaved: () => false, toggleSave: vi.fn() }),
}))

vi.mock('../../modules/results-map-view', () => ({
  ResultsMapView: ({ onViewModeChange }: { onViewModeChange: (mode: 'list' | 'map') => void }) => (
    <button type="button" onClick={() => onViewModeChange('map')}>Abrir mapa</button>
  ),
  ResultsDesktopMapPanel: ({
    onSelectCluster, onViewportChange, selectedPropertyIds,
  }: {
    onSelectCluster: (ids: string[]) => void
    onViewportChange: (ids: string[]) => void
    selectedPropertyIds?: string[]
  }) => (
    <div>
      <button type="button" onClick={() => onSelectCluster(Array.from({ length: 9 }, (_, index) => `property-${index + 1}`))}>Seleccionar grupo de 9</button>
      <button type="button" onClick={() => onViewportChange(['property-1', 'property-2', 'property-3', 'property-4'])}>Acercar y dividir en 4 + 5</button>
      <output data-testid="map-selected-property-ids">{selectedPropertyIds?.join(',') ?? ''}</output>
    </div>
  ),
}))

const filters: SearchFilters = { query: '', operations: [], propertyType: 'all', zoneId: 'all' }
const properties: Property[] = Array.from({ length: 9 }, (_, index) => ({
  id: `property-${index + 1}`,
  title: `Casa ${index + 1}`,
  location: 'La Habana',
  description: '',
  zoneId: 'habana',
  operation: 'venta',
  propertyType: 'casa',
  priceUsd: 50000,
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  areaM2: 80,
  amenities: [],
  status: 'published',
  coverTone: '',
  coverImage: '',
  mapPoint: { x: 0, y: 0 },
  coordinates: { latitude: 0, longitude: 0 },
}))

describe('ResultsPage map selection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })
  })

  it('keeps the full nine-property selection on the map when zoom splits it into clusters of four and five', async () => {
    const { ResultsPage } = await import('./ResultsPage')
    render(<ResultsPage filters={filters} properties={properties} onSelectProperty={vi.fn()} onClearFilters={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapa' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar grupo de 9' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar grupo de 9' }))

    expect(screen.getByRole('heading', { name: '9 propiedades en Cuba' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ver Casa [1-9]$/ })).toHaveLength(9)
    expect(screen.getByTestId('map-selected-property-ids')).toHaveTextContent(
      Array.from({ length: 9 }, (_, index) => `property-${index + 1}`).join(','),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Acercar y dividir en 4 + 5' }))

    expect(screen.getByRole('heading', { name: '9 propiedades en Cuba' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ver Casa [1-9]$/ })).toHaveLength(9)
    expect(screen.getByTestId('map-selected-property-ids')).toHaveTextContent(
      Array.from({ length: 9 }, (_, index) => `property-${index + 1}`).join(','),
    )
  })
})
