import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminPage } from './AdminPage'

const mockReports = [
  {
    id: 'report-1',
    property_id: 'prop-1',
    reporter_id: null,
    reason: 'Fraude o estafa',
    description: 'Este anuncio tiene fotos falsas.',
    status: 'pending',
    created_at: new Date().toISOString(),
    properties: {
      id: 'prop-1',
      title: 'Casa en Vedado',
      cover_image: null,
      status: 'published',
    },
  },
]

const mockProperties = [
  {
    id: 'prop-1',
    title: 'Casa en Vedado',
    location: 'Vedado, La Habana',
    description: 'Propiedad en perfecto estado.',
    price_usd: 40000,
    cover_image: null,
    images: [],
    created_at: new Date().toISOString(),
    user_id: 'user-1',
    operation: 'venta',
    property_type: 'casa',
    bedrooms: 2,
    bathrooms: 1,
    parking: 0,
    area_m2: 90,
    age_years: null,
    amenities: null,
    features: null,
    contact_info: null,
    status: 'published',
    moderation_message: null,
  },
]

const mockProfiles = [
  { id: 'user-1', full_name: 'Juan Perez', email: 'juan@gmail.com' },
]

const mockFrom = vi.fn().mockImplementation((table: string) => {
  const target = {}
  const proxy = new Proxy(target, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: any) => {
          if (table === 'property_reports') {
            return Promise.resolve(resolve({ data: mockReports, error: null }))
          }
          if (table === 'properties') {
            return Promise.resolve(resolve({ data: mockProperties, error: null }))
          }
          if (table === 'profiles') {
            return Promise.resolve(resolve({ data: mockProfiles, error: null }))
          }
          return Promise.resolve(resolve({ data: [], error: null }))
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

describe('AdminPage - Panel de Moderacion y Reportes', () => {
  it('debería renderizar la lista de propiedades pendientes de revisión por defecto', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} />)

    // Debería cambiar la pestaña inicial a la lista
    await waitFor(() => {
      expect(screen.getByText('Panel de moderación')).toBeInTheDocument()
    })
  })

  it('debería alternar a la pestaña de "Reportes" y listar las quejas activas', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} />)

    // Hacer clic en la pestaña Reportes
    const tabButton = screen.getByRole('button', { name: /reportes/i })
    fireEvent.click(tabButton)

    await waitFor(() => {
      expect(screen.getByText(/Fraude o estafa/i)).toBeInTheDocument()
      expect(screen.getByText(/Este anuncio tiene fotos falsas/i)).toBeInTheDocument()
      expect(screen.getByText(/Casa en Vedado/i)).toBeInTheDocument()
    })
  })

  it('debería llamar a la acción de ocultar propiedad y resolver reporte al hacer clic en "Ocultar propiedad"', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} />)

    // Cambiar a pestaña reportes
    fireEvent.click(screen.getByRole('button', { name: /reportes/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ocultar propiedad/i })).toBeInTheDocument()
    })

    const hideButton = screen.getByRole('button', { name: /ocultar propiedad/i })
    fireEvent.click(hideButton)

    await waitFor(() => {
      // Debe actualizar el estado de la propiedad a 'paused'
      expect(mockFrom).toHaveBeenCalledWith('properties')
      // Debe actualizar el estado del reporte a 'resolved'
      expect(mockFrom).toHaveBeenCalledWith('property_reports')
    })
  })

  it('debería descartar el reporte al hacer clic en "Descartar reporte"', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} />)

    // Cambiar a pestaña reportes
    fireEvent.click(screen.getByRole('button', { name: /reportes/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /descartar reporte/i })).toBeInTheDocument()
    })

    const dismissButton = screen.getByRole('button', { name: /descartar reporte/i })
    fireEvent.click(dismissButton)

    await waitFor(() => {
      // Debe actualizar el estado del reporte a 'dismissed'
      expect(mockFrom).toHaveBeenCalledWith('property_reports')
    })
  })
})
