import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceDirectoryPage } from './ServiceDirectoryPage'
import { fetchHomeServiceProvider, fetchHomeServiceProviders } from '../../modules/home-services/homeServiceRepository'

vi.mock('../../shared/hooks/useSEO', () => ({ useSEO: vi.fn() }))
vi.mock('../../shared/ui/MarketplaceContactActions', () => ({ MarketplaceContactActions: () => <div><button type="button">Contactar</button><button type="button">Consultar</button></div> }))
vi.mock('../../modules/home-services/homeServiceRepository', () => ({
  fetchHomeServiceProvider: vi.fn(),
  fetchHomeServiceProviders: vi.fn(),
  fetchHomeServiceProvinceCounts: vi.fn().mockResolvedValue([]),
  sendHomeServiceInquiry: vi.fn(),
}))
vi.mock('../../modules/marketplace/MarketplaceMapToggle', () => ({
  MarketplaceMapToggle: ({ onToggle }: { onToggle: () => void }) => <button type="button" onClick={onToggle}>Mostrar mapa</button>,
}))
vi.mock('../../modules/catalog-explorer/CatalogMap', () => ({
  CatalogMap: ({ onSelectProvince, selectedProvince }: { onSelectProvince: (province: string) => void; selectedProvince: string }) => (
    <div>
      <span>Mapa de servicios: {selectedProvince || 'Toda Cuba'}</span>
      <button type="button" onClick={() => onSelectProvince('Matanzas')}>Filtrar Matanzas en el mapa</button>
    </div>
  ),
}))

const provider = {
  id: 'provider-1',
  slug: 'fontanero-centro',
  displayName: 'Fontanero del Centro',
  category: 'plomeria' as const,
  description: 'Reparación de tuberías y grifería.',
  province: 'La Habana',
  municipalities: ['Centro Habana'],
  phone: null,
  whatsapp: null,
  galleryUrls: [],
  updatedAt: '2026-11-09T12:00:00.000Z',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('ServiceDirectoryPage filter loading', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/servicios')
    vi.mocked(fetchHomeServiceProvider).mockReset()
    vi.mocked(fetchHomeServiceProvider).mockResolvedValue(provider)
    vi.mocked(fetchHomeServiceProviders).mockReset()
    vi.mocked(fetchHomeServiceProviders).mockResolvedValue({ items: [provider], total: 1 })
  })

  it('renders the shared detail design with service-specific information', async () => {
    window.history.replaceState(null, '', '/servicios/fontanero-centro')
    vi.mocked(fetchHomeServiceProvider).mockResolvedValueOnce({ ...provider, galleryUrls: ['/service-one.webp', '/service-two.webp'] })
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Fontanero del Centro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al directorio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Información del servicio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Descripción del servicio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Área de servicio' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tu mensaje')).toHaveClass('marketplace-inquiry-textarea')
    expect(document.querySelector('.marketplace-contact-meta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar consulta' })).toHaveClass('marketplace-inquiry-submit')
    expect(screen.getByRole('button', { name: 'Foto anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver foto 2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al directorio' }))
    expect(window.location.pathname).toBe('/servicios')
  })

  it('does not show publish or account shortcuts in the directory header', async () => {
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar mi servicio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mis perfiles' })).not.toBeInTheDocument()
  })

  it.each(['Contactar', 'Consultar'])('%s uses the direct contact action without navigating to the profile first', async (action) => {
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()
    const pushState = vi.spyOn(window.history, 'pushState')

    fireEvent.click(screen.getByRole('button', { name: action }))

    expect(window.location.pathname).toBe('/servicios')
    expect(pushState).not.toHaveBeenCalled()
    pushState.mockRestore()
  })

  it('keeps filters, map, and current results mounted while refreshing', async () => {
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()

    const initialPath = window.location.pathname
    const pushState = vi.spyOn(window.history, 'pushState')
    const nextRequest = deferred<{ items: typeof provider[]; total: number }>()
    vi.mocked(fetchHomeServiceProviders).mockReturnValueOnce(nextRequest.promise)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar servicio' }), { target: { value: 'fontanero' } })

    expect(screen.getByRole('searchbox', { name: 'Buscar servicio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar mapa' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(initialPath)
    expect(pushState).not.toHaveBeenCalled()
    expect(screen.getByText('Fontanero del Centro')).toBeInTheDocument()
    expect(screen.getByText('1 profesional disponible')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Actualizando profesionales' })).toBeInTheDocument()
    expect(screen.queryByRole('main', { name: 'Cargando servicios' })).not.toBeInTheDocument()

    nextRequest.resolve({ items: [provider], total: 1 })
    await waitFor(() => expect(screen.getByText('Fontanero del Centro')).toBeInTheDocument())
    pushState.mockRestore()
  })

  it('fetches a numbered server page instead of appending more professionals', async () => {
    vi.mocked(fetchHomeServiceProviders).mockResolvedValueOnce({ items: [provider], total: 31 })
    const nextRequest = deferred<{ items: Array<typeof provider>; total: number }>()
    vi.mocked(fetchHomeServiceProviders).mockReturnValueOnce(nextRequest.promise)
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Paginación del catálogo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cargar más profesionales' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(screen.getByText('Fontanero del Centro')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Actualizando profesionales' })).toBeInTheDocument()
    expect(fetchHomeServiceProviders).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 15, pageSize: 15 }))

    const secondProvider = { ...provider, id: 'provider-2', slug: 'segundo', displayName: 'Segundo profesional' }
    nextRequest.resolve({ items: [secondProvider], total: 31 })
    expect(await screen.findByText('Segundo profesional')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    vi.mocked(fetchHomeServiceProviders).mockResolvedValueOnce({ items: [provider], total: 1 })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar servicio' }), { target: { value: 'fontanero' } })
    await waitFor(() => expect(fetchHomeServiceProviders).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, pageSize: 15 })))
    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()
  })

  it('applies a map province without navigation and resets the municipality and page', async () => {
    vi.mocked(fetchHomeServiceProviders).mockResolvedValueOnce({ items: [provider], total: 31 })
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(fetchHomeServiceProviders).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 15, pageSize: 15 })))
    fireEvent.change(screen.getByRole('combobox', { name: 'Provincia' }), { target: { value: 'La Habana' } })
    await waitFor(() => expect(fetchHomeServiceProviders).toHaveBeenLastCalledWith(expect.objectContaining({ province: 'La Habana', offset: 0 })))
    fireEvent.change(screen.getByRole('combobox', { name: 'Municipio' }), { target: { value: 'Playa' } })
    await waitFor(() => expect(fetchHomeServiceProviders).toHaveBeenLastCalledWith(expect.objectContaining({ municipality: 'Playa' })))

    const initialPath = window.location.pathname
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mapa' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Filtrar Matanzas en el mapa' }))

    await waitFor(() => expect(fetchHomeServiceProviders).toHaveBeenLastCalledWith(expect.objectContaining({
      province: 'Matanzas', municipality: undefined, offset: 0, pageSize: 15,
    })))
    expect(screen.getByText('Mapa de servicios: Matanzas')).toBeInTheDocument()
    expect(window.location.pathname).toBe(initialPath)
  })

  it('prioritizes the first two provider photos and defers the rest', async () => {
    const image = 'https://images.unsplash.com/photo-123?auto=format'
    vi.mocked(fetchHomeServiceProviders).mockResolvedValueOnce({
      items: [0, 1, 2].map((index) => ({
        ...provider,
        id: `provider-${index}`,
        slug: `provider-${index}`,
        displayName: `Profesional ${index}`,
        galleryUrls: [image],
      })),
      total: 3,
    })
    const { container } = render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)

    await screen.findByText('Profesional 0')
    const images = Array.from(container.querySelectorAll('img'))
    expect(images).toHaveLength(3)
    expect(images[0]).toHaveAttribute('loading', 'eager')
    expect(images[0]).toHaveAttribute('fetchpriority', 'high')
    expect(images[0].getAttribute('src')).toContain('w=420')
    expect(images[1]).toHaveAttribute('loading', 'eager')
    expect(images[1]).toHaveAttribute('fetchpriority', 'high')
    expect(images[2]).toHaveAttribute('loading', 'lazy')
    expect(images[2]).toHaveAttribute('fetchpriority', 'low')
  })

  it('shows the shared photo carousel when a provider has multiple photos', async () => {
    vi.mocked(fetchHomeServiceProviders).mockResolvedValueOnce({
      items: [{ ...provider, galleryUrls: ['https://example.com/service-1.jpg', 'https://example.com/service-2.jpg'] }],
      total: 1,
    })
    render(<ServiceDirectoryPage onRequireLogin={vi.fn()} />)

    expect(await screen.findByText('Fontanero del Centro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Fotos de Fontanero del Centro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver foto 2' })).toBeInTheDocument()
  })
})
