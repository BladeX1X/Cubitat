import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DetailPage } from './DetailPage'
import { useSEO } from '../../shared/hooks/useSEO'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'

const {
  mockGetUser,
  mockGetSession,
  mockSubmitPublicContact,
  mockSubmitPublicReport,
  mockTurnstileMount,
  mockRpc,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockSubmitPublicContact: vi.fn(),
  mockSubmitPublicReport: vi.fn(),
  mockTurnstileMount: vi.fn(),
  mockRpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
}))

vi.mock('./publicSubmissions', () => ({
  submitPublicContact: mockSubmitPublicContact,
  submitPublicReport: mockSubmitPublicReport,
}))

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

vi.mock('../../shared/ui/TurnstileWidget', async () => {
  const { useEffect, useRef } = await import('react')

  return {
    TurnstileWidget: ({ action, onVerify }: { action: string; onVerify: (token: string) => void }) => {
      const onVerifyRef = useRef(onVerify)

      useEffect(() => {
        mockTurnstileMount(action)
        onVerifyRef.current('test-turnstile-token')
      }, [action])

      return null
    },
  }
})

// Mock SupabaseClient
const mockInsert = vi.fn().mockImplementation(() => Promise.resolve({ error: null }))
const mockNot = vi.fn()
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
      if (prop === 'not') {
        return (...args: unknown[]) => {
          mockNot(...args)
          return proxy
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
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
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
  id: '00000000-0000-0000-0000-000000000099',
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
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    localStorage.clear()
    mockInsert.mockClear()
    mockNot.mockClear()
    mockFrom.mockClear()
    mockTurnstileMount.mockClear()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSubmitPublicContact.mockReset().mockResolvedValue(undefined)
    mockSubmitPublicReport.mockReset().mockResolvedValue(undefined)
  })

  it('debería renderizar la información básica de la propiedad', () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(screen.getAllByText('Casa independiente en Playa')[0]).toBeInTheDocument()
    expect(screen.getAllByText('USD 68,000')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Playa, La Habana')[0]).toBeInTheDocument()
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

  it('excluye UUID relacionados con sintaxis PostgREST válida', async () => {
    const propertyId = '00000000-0000-0000-0000-000000000089'

    render(
      <DetailPage
        property={{ ...mockProperty, id: propertyId }}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    await waitFor(() => {
      expect(mockNot).toHaveBeenCalledWith('id', 'in', `(${propertyId})`)
    })
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

  it('debería enviar el reporte mediante el endpoint protegido al rellenar el formulario', async () => {
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
      expect(mockSubmitPublicReport).toHaveBeenCalledWith({
        turnstileToken: 'test-turnstile-token',
        propertyId: '00000000-0000-0000-0000-000000000099',
        reason: 'FRAUD',
        description: 'Esta casa no es del anunciante actual.',
        accessToken: undefined,
      })
    })

    // Mensaje de éxito de reporte enviado
    expect(screen.getByText('¡Reporte enviado con éxito!')).toBeInTheDocument()
  })

  it('vincula el reporte autenticado con el usuario para cumplir RLS', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'authenticated-report-token' } },
      error: null,
    })

    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /reportar propiedad sospechosa/i }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'FRAUD' } })
    fireEvent.change(screen.getByPlaceholderText(/Explica brevemente/i), {
      target: { value: 'Reporte autenticado de prueba.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar reporte/i }))

    await waitFor(() => {
      expect(mockSubmitPublicReport).toHaveBeenCalledWith(expect.objectContaining({
        propertyId: '00000000-0000-0000-0000-000000000099',
        accessToken: 'authenticated-report-token',
      }))
    })
  })

  it('renueva Turnstile cuando falla la insercion de un reporte', async () => {
    mockSubmitPublicReport.mockRejectedValueOnce(new Error('fallo controlado'))

    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /reportar propiedad sospechosa/i }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'FRAUD' } })
    fireEvent.change(screen.getByPlaceholderText(/Explica brevemente/i), {
      target: { value: 'Fallo de insercion controlado.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar reporte/i }))

    await screen.findByText(/ocurrió un error al enviar el reporte/i)
    await waitFor(() => {
      expect(mockTurnstileMount.mock.calls.filter(([action]) => action === 'report-property')).toHaveLength(2)
    })
  })

  it('debería guardar una consulta de contacto y mostrar confirmación', async () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Ana Pérez' } })
    fireEvent.change(screen.getByLabelText(/teléfono o whatsapp/i), { target: { value: '+53 51234567' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje y ver contacto/i }))

    await waitFor(() => {
      expect(mockSubmitPublicContact).toHaveBeenCalledWith(expect.objectContaining({
        propertyId: '00000000-0000-0000-0000-000000000099',
        contactName: 'Ana Pérez',
        contactPhone: '+5351234567',
      }))
    })

    expect(screen.getByText(/¡Mensaje enviado!/i)).toBeInTheDocument()
    expect(localStorage.getItem('cubitat_contact_sent_00000000-0000-0000-0000-000000000099')).toBeTruthy()
  })

  it('rechaza un teléfono inválido antes de enviar la consulta', async () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Ana Pérez' } })
    fireEvent.change(screen.getByLabelText(/teléfono o whatsapp/i), { target: { value: 'abc---123' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje y ver contacto/i }))

    expect(await screen.findByText(/escribe un teléfono válido/i)).toBeInTheDocument()
    expect(mockSubmitPublicContact).not.toHaveBeenCalled()
  })

  it('no ofrece contacto ni reporte para una propiedad pendiente de revisión', () => {
    render(
      <DetailPage
        property={{ ...mockProperty, status: 'pending_review' }}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(screen.getByText(/el contacto estará disponible cuando el anuncio sea publicado/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar mensaje y ver contacto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reportar propiedad sospechosa/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^contactar$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^consultar$/i })).not.toBeInTheDocument()
    expect(mockTurnstileMount.mock.calls.some(([action]) => action === 'contact-owner')).toBe(false)
  })

  it('conserva los datos del formulario durante la verificación asíncrona', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }))

    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Rodolfo QA' } })
    fireEvent.change(screen.getByLabelText(/teléfono o whatsapp/i), { target: { value: '+53 51111111' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje y ver contacto/i }))

    await waitFor(() => {
      expect(mockSubmitPublicContact).toHaveBeenCalledWith(expect.objectContaining({
        propertyId: '00000000-0000-0000-0000-000000000099',
        contactName: 'Rodolfo QA',
        contactPhone: '+5351111111',
      }))
    })

    expect(screen.getByText(/¡Mensaje enviado!/i)).toBeInTheDocument()
  })

  it('debería bloquear contactos repetidos durante cinco minutos', () => {
    localStorage.setItem('cubitat_contact_sent_00000000-0000-0000-0000-000000000099', Date.now().toString())

    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(screen.getByText(/¡Mensaje enviado!/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar mensaje y ver contacto/i })).not.toBeInTheDocument()
    expect(mockSubmitPublicContact).not.toHaveBeenCalled()
  })
})
