import { afterEach, describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultsPage } from './ResultsPage'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'
import { PHASE_TWO_ENABLED } from '../../shared/config/features'

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

afterEach(() => {
  window.history.replaceState(null, '', window.location.href)
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
    const { container } = render(
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
    expect(container.querySelector('#resultados')).toHaveClass('results-stable-viewport')
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

  it('prioriza las dos primeras imagenes visibles y difiere las siguientes', () => {
    const propertiesWithImages = [
      ...mockProperties,
      {
        ...mockProperties[0],
        id: 'prop-3',
        title: 'Casa en Centro Habana',
      },
    ].map((property, index) => ({
      ...property,
      coverImage: `https://images.unsplash.com/photo-${index + 1}?w=900&q=80`,
    }))
    const { container } = render(
      <ResultsPage
        filters={mockFilters}
        properties={propertiesWithImages}
        onSelectProperty={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    )

    const images = container.querySelectorAll<HTMLImageElement>('.property-photo-slide')

    expect(images[0]).toHaveAttribute('loading', 'eager')
    expect(images[0]).toHaveAttribute('fetchpriority', 'high')
    expect(images[0].src).toContain('w=420')
    expect(images[0].src).toContain('q=45')
    expect(images[1]).toHaveAttribute('loading', 'eager')
    expect(images[1]).toHaveAttribute('fetchpriority', 'high')
    expect(images[2]).toHaveAttribute('loading', 'lazy')
    expect(images[2]).toHaveAttribute('fetchpriority', 'low')
  })

  it('muestra un estado vacio accesible sin resultados', () => {
    const { container } = render(
      <ResultsPage
        filters={mockFilters}
        properties={[]}
        onSelectProperty={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    )

    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(container.querySelector('.results-empty-state svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('restaura el mapa al volver desde detalle y preserva el estado existente del historial', () => {
    window.history.replaceState({ searchContext: 'preserved' }, '', window.location.href)
    const props = {
      filters: mockFilters,
      properties: mockProperties,
      onSelectProperty: vi.fn(),
      onClearFilters: vi.fn(),
    }
    const firstRender = render(<ResultsPage {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mapa' }))
    expect(window.history.state).toEqual({
      searchContext: 'preserved',
      resultsViewMode: 'map',
    })
    firstRender.unmount()

    render(<ResultsPage {...props} />)
    expect(screen.getByRole('button', { name: 'Ocultar mapa' })).toBeInTheDocument()
  })

  it.skipIf(!PHASE_TWO_ENABLED)('filtra propiedades no verificadas cuando verifiedOnly esta activo en DEV', () => {
    const verifiedProperties: Property[] = [
      {
        ...mockProperties[0],
        id: 'ver-1',
        title: 'Propiedad Verificada',
        isVerifiedAgent: true,
      },
      {
        ...mockProperties[1],
        id: 'unver-1',
        title: 'Propiedad No Verificada',
        isVerifiedAgent: false,
      },
    ]

    render(
      <ResultsPage
        filters={{ ...mockFilters, verifiedOnly: true }}
        properties={verifiedProperties}
        onSelectProperty={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    )

    expect(screen.getByText('Propiedad Verificada')).toBeInTheDocument()
    expect(screen.queryByText('Propiedad No Verificada')).not.toBeInTheDocument()
  })
})
