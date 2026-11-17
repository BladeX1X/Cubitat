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
    onSelectCluster, onViewportChange,
  }: {
    onSelectCluster: (ids: string[]) => void
    onViewportChange: (ids: string[]) => void
  }) => (
    <div>
      <button type="button" onClick={() => onSelectCluster(Array.from({ length: 8 }, (_, index) => `property-${index + 1}`))}>Seleccionar grupo de 8</button>
      <button type="button" onClick={() => onViewportChange(['property-9'])}>Cambiar zoom</button>
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

  it('shows all eight properties selected from a cluster and keeps them after zoom', async () => {
    const { ResultsPage } = await import('./ResultsPage')
    render(<ResultsPage filters={filters} properties={properties} onSelectProperty={vi.fn()} onClearFilters={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapa' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar grupo de 8' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar grupo de 8' }))

    expect(screen.getByRole('heading', { name: '8 propiedades en Cuba' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ver Casa [1-8]$/ })).toHaveLength(8)

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar zoom' }))

    expect(screen.getByRole('heading', { name: '8 propiedades en Cuba' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ver Casa [1-8]$/ })).toHaveLength(8)
    expect(screen.queryByRole('button', { name: 'Ver Casa 9' })).not.toBeInTheDocument()
  })
})
