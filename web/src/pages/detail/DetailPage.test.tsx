import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DetailPage } from './DetailPage'
import { useSEO } from '../../shared/hooks/useSEO'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'

// Mock useSavedProperties
vi.mock('../../modules/properties/hooks/useSavedProperties', () => ({
  useSavedProperties: () => ({
    isSaved: () => false,
    toggleSave: vi.fn(),
  }),
}))

// Mock useSEO
vi.mock('../../shared/hooks/useSEO', () => ({
  useSEO: vi.fn(),
}))

// Mock SupabaseClient
const mockInsert = vi.fn().mockImplementation(() => Promise.resolve({ error: null }))
const mockFrom = vi.fn().mockImplementation((table: string) => {
  const proxy: any = new Proxy({}, {
    get(_, prop) {
      if (prop === 'insert') {
        return mockInsert
      }
      if (prop === 'then') {
        return (resolve: any) => {
          if (table === 'properties') {
            return Promise.resolve(resolve({ data: [], error: null }))
          }
          return Promise.resolve(resolve({ data: null, error: null }))
        }
      }
      return () => proxy
    }
  })
  return proxy
})

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}))

// Mock IntersectionObserver
beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  (globalThis as any).IntersectionObserver = MockIntersectionObserver as any
})

const mockProperty: Property = {
  id: 'prop-detail-1',
  title: 'Casa independiente en Playa',
  location: 'Playa, La Habana',
  priceUsd: 68000,
  operation: 'venta',
  propertyType: 'casa',
  zoneId: 'playa',
  coverImage: 'https://example.com/image.jpg',
  coverTone: '#ccc',
  bedrooms: 3,
  bathrooms: 2,
  parking: 1,
  areaM2: 120,
  description: 'Espectacular casa independiente en la mejor zona de Playa.',
  amenities: ['Garaje', 'Agua de la calle', 'Gas licuado'],
  status: 'published',
  mapPoint: { x: 0, y: 0 },
  coordinates: { latitude: 23.1136, longitude: -82.3666 },
}

const mockFilters: SearchFilters = {
  query: 'Habana',
  operations: [],
  propertyType: 'all',
  zoneId: 'all',
}

describe('DetailPage - Reportes y Visor', () => {
  it('debería renderizar la información básica de la propiedad', () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(screen.getByText('Casa independiente en Playa')).toBeInTheDocument()
    expect(screen.getByText('USD 68,000')).toBeInTheDocument()
    expect(screen.getByText('Playa, La Habana')).toBeInTheDocument()
  })

  it('debería registrar metadatos SEO dinámicos con Open Graph', () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(useSEO).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringMatching(/Casa independiente en Playa - USD\s68,000/),
      description: expect.stringContaining('Espectacular casa independiente en la mejor zona de Playa.'),
      image: 'https://example.com/image.jpg',
      type: 'article',
    }))
  })

  it('debería abrir el modal de reportes al hacer clic en "Reportar propiedad sospechosa"', () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    const reportButton = screen.getByRole('button', { name: /reportar propiedad sospechosa/i })
    fireEvent.click(reportButton)

    expect(screen.getByRole('heading', { name: /informar sobre un problema/i })).toBeInTheDocument()
  })

  it('debería enviar el reporte de propiedad a Supabase al rellenar el formulario', async () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    // Abrir modal
    const reportButton = screen.getByRole('button', { name: /reportar propiedad sospechosa/i })
    fireEvent.click(reportButton)

    // Seleccionar motivo
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'FRAUD' } })

    // Escribir comentarios adicionales
    const textarea = screen.getByPlaceholderText(/Explica brevemente/i)
    fireEvent.change(textarea, { target: { value: 'Esta casa no es del anunciante actual.' } })

    // Hacer clic en Enviar
    const submitButton = screen.getByRole('button', { name: /enviar reporte/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('property_reports')
      expect(mockInsert).toHaveBeenCalledWith({
        property_id: 'prop-detail-1',
        reason: 'FRAUD',
        description: 'Esta casa no es del anunciante actual.',
        status: 'pending',
      })
    })

    // Mensaje de éxito de reporte enviado
    expect(screen.getByText('¡Reporte enviado con éxito!')).toBeInTheDocument()
  })
})
