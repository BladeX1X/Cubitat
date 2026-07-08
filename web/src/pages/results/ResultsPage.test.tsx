import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultsPage } from './ResultsPage'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'

vi.mock('../../modules/properties/hooks/useSavedProperties', () => ({
  useSavedProperties: () => ({
    savedPropertyIds: new Set<string>(),
    loading: false,
    isSaved: () => false,
    toggleSave: vi.fn(),
  }),
}))

// Mock IntersectionObserver for Vitest environment
beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  (globalThis as any).IntersectionObserver = MockIntersectionObserver as any
})

vi.mock('embla-carousel-react', () => {
  return {
    default: vi.fn().mockReturnValue([
      vi.fn(), // emblaRef
      {
        on: vi.fn(),
        off: vi.fn(),
        selectedScrollSnap: vi.fn().mockReturnValue(0),
        clickAllowed: vi.fn().mockReturnValue(true),
        scrollPrev: vi.fn(),
        scrollNext: vi.fn(),
        canScrollPrev: vi.fn().mockReturnValue(true),
        canScrollNext: vi.fn().mockReturnValue(true),
      }
    ])
  }
})

const mockProperties: Property[] = [
  {
    id: 'prop-1',
    title: 'Casa en Playa',
    location: 'Playa, La Habana',
    priceUsd: 45000,
    operation: 'venta',
    propertyType: 'casa',
    zoneId: 'playa',
    coverImage: '',
    coverTone: '#ccc',
    bedrooms: 3,
    bathrooms: 2,
    parking: 1,
    areaM2: 120,
    description: 'Hermosa casa.',
    amenities: ['Agua', 'Gas'],
    status: 'published',
    mapPoint: { x: 0, y: 0 },
    coordinates: { latitude: 0, longitude: 0 },
  },
  {
    id: 'prop-2',
    title: 'Apartamento en Vedado',
    location: 'Plaza de la Revolución, La Habana',
    priceUsd: 25000,
    operation: 'alquiler',
    propertyType: 'apartamento',
    zoneId: 'vedado',
    coverImage: '',
    coverTone: '#ddd',
    bedrooms: 1,
    bathrooms: 1,
    parking: 0,
    areaM2: 50,
    description: 'Apartamento acogedor.',
    amenities: ['Gas'],
    status: 'published',
    mapPoint: { x: 0, y: 0 },
    coordinates: { latitude: 0, longitude: 0 },
  },
]

const mockFilters: SearchFilters = {
  query: 'Habana',
  operations: [],
  propertyType: 'all',
  zoneId: 'all',
}

describe('ResultsPage', () => {
  it('debería renderizar la cantidad correcta de propiedades y contador', () => {
    render(
      <ResultsPage
        filters={mockFilters}
        properties={mockProperties}
        onSelectProperty={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    expect(screen.getByText('2 propiedades en Cuba')).toBeInTheDocument()
    expect(screen.getByText('Casa en Playa')).toBeInTheDocument()
    expect(screen.getByText('Apartamento en Vedado')).toBeInTheDocument()
  })

  it('debería mostrar los filtros activos en los chips', () => {
    const customFilters: SearchFilters = {
      query: 'Playa',
      operations: ['venta'],
      propertyType: 'casa',
      zoneId: 'playa',
    }

    render(
      <ResultsPage
        filters={customFilters}
        properties={mockProperties}
        onSelectProperty={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    expect(screen.getByText('Venta')).toBeInTheDocument()
    expect(screen.getByText('Casas')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Playa')).toBeInTheDocument()
  })

  it('debería llamar a onClearFilters al hacer clic en Limpiar filtros', () => {
    const handleClearFilters = vi.fn()
    render(
      <ResultsPage
        filters={mockFilters}
        properties={mockProperties}
        onSelectProperty={vi.fn()}
        onClearFilters={handleClearFilters}
      />
    )

    // Clic en Filtros para abrir el popover
    const filtersButton = screen.getByRole('button', { name: /filtros/i })
    fireEvent.click(filtersButton)

    const clearButton = screen.getByText(/limpiar filtros/i)
    fireEvent.click(clearButton)

    expect(handleClearFilters).toHaveBeenCalledTimes(1)
  })

  it('debería llamar a onSelectProperty al hacer clic en una tarjeta de propiedad', () => {
    const handleSelectProperty = vi.fn()
    render(
      <ResultsPage
        filters={mockFilters}
        properties={mockProperties}
        onSelectProperty={handleSelectProperty}
        onClearFilters={vi.fn()}
      />
    )

    const cardButton = screen.getByRole('button', { name: /ver casa en playa/i })
    fireEvent.click(cardButton)

    expect(handleSelectProperty).toHaveBeenCalledWith('prop-1')
  })

  it('deberia ordenar resultados por menor precio', () => {
    render(
      <ResultsPage
        filters={mockFilters}
        properties={mockProperties}
        onSelectProperty={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /ordenar resultados/i }))
    fireEvent.click(screen.getByRole('button', { name: /menor precio/i }))

    const titles = screen
      .getAllByRole('button', { name: /ver /i })
      .map((card) => card.getAttribute('aria-label'))

    expect(titles[0]).toBe('Ver Apartamento en Vedado')
    expect(titles[1]).toBe('Ver Casa en Playa')
  })
})
