import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DetailPage } from './DetailPage'
import { useSEO } from '../../shared/hooks/useSEO'
import type { Property } from '../../modules/properties/types'
import type { SearchFilters } from '../../modules/search/types'
import { fetchMarketplaceContact, getMarketplaceContactUrl } from '../../shared/lib/marketplaceContact'

const {
  mockGetUser,
  mockGetSession,
  mockSubmitPublicContact,
  mockSubmitPublicReport,
  mockTurnstileMount,
  mockRpc,
  mockMapInstances,
  mockFetchMarketplaceContact,
  mockGetMarketplaceContactUrl,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockSubmitPublicContact: vi.fn(),
  mockSubmitPublicReport: vi.fn(),
  mockTurnstileMount: vi.fn(),
  mockRpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  mockMapInstances: [] as Array<{
    options?: unknown
    handlers: Record<string, (event?: { error?: Error }) => void>
    emit: (event: string, payload?: { error?: Error }) => void
  }>,
  mockFetchMarketplaceContact: vi.fn(),
  mockGetMarketplaceContactUrl: vi.fn((channel: 'phone' | 'whatsapp') => channel === 'phone'
    ? 'tel:+5351234567'
    : 'https://wa.me/5355510101?text=hello'),
}))

vi.mock('../../shared/lib/marketplaceContact', () => ({
  fetchMarketplaceContact: mockFetchMarketplaceContact,
  getMarketplaceContactUrl: mockGetMarketplaceContactUrl,
}))

vi.mock('maplibre-gl', () => {
  class MockMap {
    options?: unknown
    handlers: Record<string, (event?: { error?: Error }) => void> = {}
    constructor(options?: unknown) { this.options = options; mockMapInstances.push(this) }
    once(event: string, handler: (event?: { error?: Error }) => void) { this.handlers[event] = handler; return this }
    on(event: string, handler: (event?: { error?: Error }) => void) { this.handlers[event] = handler; return this }
    emit(event: string, payload?: { error?: Error }) { this.handlers[event]?.(payload) }
    addControl() { return this }
    addSource() { return this }
    addLayer() { return this }
    remove() { return this }
  }

  return {
    Map: MockMap,
    NavigationControl: class {},
    AttributionControl: class {},
    setWorkerUrl: vi.fn(),
  }
})

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

vi.mock('../../modules/maps/lib/openFreeMapStyle', () => ({
  getOpenFreeMapStyle: vi.fn().mockResolvedValue({
    version: 8,
    sources: {},
    layers: [],
  }),
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
const mockEq = vi.fn()
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
      if (prop === 'eq') {
        return (...args: unknown[]) => {
          mockEq(...args)
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
  it('does not expose a legacy street address in detail, contact text or SEO', () => {
    const { container } = render(<DetailPage
      property={{ ...mockProperty, location: 'Calle Sintética 999, apartamento 42, Playa, La Habana' }}
      onBack={vi.fn()} onChangeFilters={vi.fn()} filters={mockFilters}
    />)
    expect(container.innerHTML).not.toContain('Calle Sintética 999')
    expect(JSON.stringify(vi.mocked(useSEO).mock.lastCall)).not.toContain('Calle Sintética 999')
    expect(screen.getAllByText('Playa, La Habana').length).toBeGreaterThan(0)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    localStorage.clear()
    // DetailPage records public views on mount; keep this test file isolated
    // from a local Worker so rejected network requests cannot outlive teardown.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    mockInsert.mockClear()
    mockEq.mockClear()
    mockNot.mockClear()
    mockFrom.mockClear()
    mockTurnstileMount.mockClear()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSubmitPublicContact.mockReset().mockResolvedValue(undefined)
    mockSubmitPublicReport.mockReset().mockResolvedValue(undefined)
    mockFetchMarketplaceContact.mockReset().mockResolvedValue({ phone: '+5351234567', whatsapp: '+5355510101' })
    mockGetMarketplaceContactUrl.mockClear()
    mockMapInstances.length = 0
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

  it('ignora clics repetidos mientras el diálogo nativo de compartir sigue activo', async () => {
    let resolveShare!: () => void
    const pendingShare = new Promise<void>((resolve) => { resolveShare = resolve })
    const share = vi.fn(() => pendingShare)
    vi.stubGlobal('navigator', {
      share,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    const shareButtons = screen.getAllByRole('button', { name: 'Compartir propiedad' })
    const shareButton = shareButtons[0]!
    fireEvent.click(shareButton!)
    fireEvent.click(shareButton!)

    expect(share).toHaveBeenCalledTimes(1)
    expect(shareButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true)

    await act(async () => {
      resolveShare()
      await pendingShare
    })
    expect(shareButtons.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
    fireEvent.click(shareButton)
    expect(share).toHaveBeenCalledTimes(2)
  })

  it('usa el portapapeles en escritorio aunque navigator.share esté disponible', async () => {
    const share = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
      clipboard: { writeText },
    })
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Compartir propiedad' })[0]!)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
    expect(share).not.toHaveBeenCalled()
    expect(await screen.findByText('Copiado')).toBeInTheDocument()
  })

  it('limita las propiedades similares a anuncios publicados', async () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('status', 'published')
    })
  })

  it('abre el teléfono del anunciante desde Contactar en el detalle', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^contactar$/i }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith('tel:+5351234567'))
    expect(fetchMarketplaceContact).toHaveBeenCalledWith('property', mockProperty.id)
    expect(getMarketplaceContactUrl).toHaveBeenCalledWith('phone', '+5351234567', mockProperty.title, 'Playa, La Habana')
    vi.unstubAllGlobals()
  })

  it('abre WhatsApp con el contexto de la publicación desde el detalle', async () => {
    const popup = { location: { replace: vi.fn() }, opener: {} as Window | null, close: vi.fn() } as unknown as Window
    const open = vi.fn(() => popup)
    vi.stubGlobal('open', open)
    render(
      <DetailPage
        property={{ ...mockProperty, contact_info: { phone: '+5351234567' } }}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /^consultar$/i })[0])

    await waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://wa.me/5355510101?text=hello'))
    expect(fetchMarketplaceContact).toHaveBeenCalledWith('property', mockProperty.id)
    expect(getMarketplaceContactUrl).toHaveBeenCalledWith('whatsapp', '+5355510101', mockProperty.title, 'Playa, La Habana')
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    vi.unstubAllGlobals()
  })

  it('muestra lo que busca el anunciante en una permuta', () => {
    render(
      <DetailPage
        property={{
          ...mockProperty,
          operation: 'permuta',
          features: {
            exchangePreferences: {
              propertyType: 'apartamento',
              province: 'La Habana',
              municipality: 'Playa',
              minBedrooms: 2,
              minAreaM2: 70,
              notes: 'Preferiblemente cerca del mar.',
              cashAdjustment: { direction: 'pay', amountUsd: 15000 },
            },
          },
        }}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(screen.getByRole('heading', { name: /busca a cambio/i })).toBeInTheDocument()
    expect(screen.getByText('Departamento')).toBeInTheDocument()
    expect(screen.getAllByText('Playa, La Habana').length).toBeGreaterThan(0)
    expect(screen.getByText(/puede pagar hasta USD 15,000/i)).toBeInTheDocument()
    expect(screen.getByText('Preferiblemente cerca del mar.')).toBeInTheDocument()
  })

  it('identifica el mapa como una ubicación aproximada', () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapa' })[0])

    expect(screen.getAllByText('Ubicación aproximada').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/el marcador no representa la dirección exacta/i).length).toBeGreaterThan(0)
  })

  it('corrige el centro del mapa si las coordenadas públicas contradicen la localidad declarada', async () => {
    const misplacedProperty = {
      ...mockProperty,
      location: 'Santiago de Cuba, Santiago de Cuba',
      coordinates: { latitude: 23.12, longitude: -82.36 },
    }

    render(
      <DetailPage
        property={misplacedProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapa' })[0])
    await waitFor(() => expect(mockMapInstances.length).toBeGreaterThan(0))
    expect(mockMapInstances.at(-1)?.options).toEqual(expect.objectContaining({ center: [-75.82, 20.02] }))
  })

  it('muestra un error recuperable si el mapa falla antes de cargar y permite reintentarlo', async () => {
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapa' })[0])
    await waitFor(() => expect(mockMapInstances.length).toBeGreaterThan(1))
    act(() => mockMapInstances.at(-1)!.emit('error', { error: new Error('style failed') }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa')
    const mapsBeforeRetry = mockMapInstances.length
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }))
    await waitFor(() => expect(mockMapInstances.length).toBeGreaterThan(mapsBeforeRetry))
    act(() => mockMapInstances.at(-1)!.emit('load'))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(mockMapInstances.length).toBeGreaterThan(mapsBeforeRetry)
  })

  it('ofrece reintentar si el mapa nunca termina de cargar', async () => {
    vi.useFakeTimers()
    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapa' })[0])
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockMapInstances.length).toBeGreaterThan(0)
    await act(async () => vi.advanceTimersByTimeAsync(15_000))

    expect(screen.getAllByText(/no se pudo cargar el mapa/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Reintentar mapa' }).length).toBeGreaterThan(0)
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
    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ver contacto/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

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
    expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    await waitFor(() => {
      expect(mockSubmitPublicContact).toHaveBeenCalledWith(expect.objectContaining({
        propertyId: '00000000-0000-0000-0000-000000000099',
        contactName: 'Rodolfo QA',
        contactPhone: '+5351111111',
      }))
    })

    expect(screen.getByText(/¡Mensaje enviado!/i)).toBeInTheDocument()
  })

  it('explica el periodo de espera sin mostrar un envío exitoso en esta ficha', () => {
    localStorage.setItem('cubitat_contact_sent_00000000-0000-0000-0000-000000000099', Date.now().toString())

    render(
      <DetailPage
        property={mockProperty}
        onBack={vi.fn()}
        onChangeFilters={vi.fn()}
        filters={mockFilters}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent(/ya enviaste una consulta a esta publicación recientemente/i)
    expect(screen.queryByText(/¡Mensaje enviado!/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).not.toBeInTheDocument()
    expect(mockSubmitPublicContact).not.toHaveBeenCalled()
  })

  it('vuelve a mostrar el formulario al terminar el periodo de espera', () => {
    vi.useFakeTimers()
    localStorage.setItem(
      'cubitat_contact_sent_00000000-0000-0000-0000-000000000099',
      String(Date.now() - 240_000),
    )
    render(<DetailPage property={mockProperty} onBack={vi.fn()} onChangeFilters={vi.fn()} filters={mockFilters} />)

    expect(screen.getByRole('status')).toHaveTextContent(/ya enviaste una consulta/i)
    act(() => vi.advanceTimersByTime(60_001))
    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeInTheDocument()
  })
})
