import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
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

const databaseMetrics = {
  db_bytes: 13_487_251,
  storage_bytes: 656_614,
  properties_count: 313,
  users_count: 25,
  reports_count: 3,
}

const { mockRpc, mockGetSession, mockGetAal, mockListFactors } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetAal: vi.fn(),
  mockListFactors: vi.fn(),
}))

const mockFrom = vi.fn().mockImplementation((table: string) => {
  const proxy: any = new Proxy({}, {
    get(_, prop) {
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
    rpc: mockRpc,
    auth: {
      getSession: mockGetSession,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAal,
        listFactors: mockListFactors,
      },
    },
  },
}))

describe('AdminPage - Panel de Moderacion y Reportes', () => {
  beforeEach(() => {
    mockRpc.mockReset().mockResolvedValue({ data: databaseMetrics, error: null })
    mockGetSession.mockReset().mockResolvedValue({
      data: { session: { access_token: 'admin-test-token' } },
      error: null,
    })
    mockGetAal.mockReset().mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
    mockListFactors.mockReset().mockResolvedValue({ data: { all: [], totp: [] }, error: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        cloudflare: { requests: 42, error: '' },
        analytics: { activeUsers: null, error: 'GA no configurado' },
        supabase: { storage_bytes: null, egress_bytes: null, db_bytes: null, error: 'Uso parcial' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('debería renderizar la lista de propiedades pendientes de revisión por defecto', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} />)

    // Debería cambiar la pestaña inicial a la lista
    await waitFor(() => {
      expect(screen.getByText('Panel de moderación')).toBeInTheDocument()
    })
  })

  it('oculta KYC cuando Fase 2 está deshabilitada en producción', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} phaseTwoEnabled={false} />)
    await screen.findByText('Panel de moderación')
    expect(screen.queryByRole('button', { name: 'KYC' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Documentos' })).not.toBeInTheDocument()
  })

  it('muestra Documentos como sección aislada cuando Fase 2 está habilitada', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} phaseTwoEnabled />)
    await screen.findByText('Panel de moderación')
    fireEvent.click(screen.getByRole('button', { name: 'Documentos' }))

    await waitFor(() => {
      expect(screen.getByText('No hay verificaciones documentales pendientes')).toBeInTheDocument()
    })
  })

  it('debería alternar a la pestaña de "Reportes" y listar las quejas activas', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} />)
    await screen.findByText('Panel de moderación')

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
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} />)
    await screen.findByText('Panel de moderación')

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
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} />)
    await screen.findByText('Panel de moderación')

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

  it('reintenta la carga de métricas cuando falla el RPC administrativo', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'Fallo temporal' } })
      .mockResolvedValueOnce({ data: databaseMetrics, error: null })

    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} />)
    await screen.findByText('Panel de moderación')
    fireEvent.click(screen.getByRole('button', { name: 'Métricas' }))

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las estadísticas.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(screen.getByText('313')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('abre la bitácora como una sección administrativa aislada', async () => {
    render(<AdminPage userRole="admin" onNavigateHome={vi.fn()} onSessionExpired={vi.fn()} />)
    await screen.findByText('Panel de moderación')
    fireEvent.click(screen.getByRole('button', { name: 'Bitácora' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bitácora de moderación' })).toBeInTheDocument()
      expect(screen.getByText(/Evidencia de solo lectura/)).toBeInTheDocument()
    })
  })
})
