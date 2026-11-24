import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaterialsMarketplacePage } from './MaterialsMarketplacePage'
import { fetchMaterialListing, fetchMaterialListings } from '../../modules/materials/materialRepository'

vi.mock('../../shared/hooks/useSEO', () => ({ useSEO: vi.fn() }))
vi.mock('../../shared/ui/MarketplaceContactActions', () => ({ MarketplaceContactActions: () => <div><button type="button">Contactar</button><button type="button">Consultar</button></div> }))
vi.mock('../../modules/materials/materialRepository', () => ({
  fetchMaterialListing: vi.fn(),
  fetchMaterialListings: vi.fn(),
  fetchMaterialProvinceCounts: vi.fn().mockResolvedValue([]),
  sendMaterialInquiry: vi.fn(),
}))
vi.mock('../../modules/marketplace/MarketplaceMapToggle', () => ({
  MarketplaceMapToggle: ({ onToggle }: { onToggle: () => void }) => <button type="button" onClick={onToggle}>Mostrar mapa</button>,
}))
vi.mock('../../modules/catalog-explorer/CatalogMap', () => ({
  CatalogMap: ({ onSelectProvince, selectedProvince }: { onSelectProvince: (province: string) => void; selectedProvince: string }) => (
    <div>
      <span>Mapa de materiales: {selectedProvince || 'Toda Cuba'}</span>
      <button type="button" onClick={() => onSelectProvince('Matanzas')}>Filtrar Matanzas en el mapa</button>
    </div>
  ),
}))

const listing = {
  id: 'material-1',
  slug: 'cemento-gris',
  title: 'Cemento gris',
  category: 'cemento' as const,
  description: 'Bolsa de cemento para construcción.',
  price: 12,
  currency: 'USD' as const,
  province: 'La Habana',
  availability: 'available' as const,
  phone: null,
  whatsapp: null,
  photoUrls: [],
  updatedAt: '2026-11-09T12:00:00.000Z',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('MaterialsMarketplacePage filter loading', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/materiales')
    vi.mocked(fetchMaterialListing).mockReset()
    vi.mocked(fetchMaterialListing).mockResolvedValue(listing)
    vi.mocked(fetchMaterialListings).mockReset()
    vi.mocked(fetchMaterialListings).mockResolvedValue({ items: [listing], total: 1 })
  })

  it('renders the shared detail design with material-specific information', async () => {
    window.history.replaceState(null, '', '/materiales/cemento-gris')
    vi.mocked(fetchMaterialListing).mockResolvedValueOnce({ ...listing, photoUrls: ['/material-one.webp', '/material-two.webp'] })
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Cemento gris' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al catálogo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Información del material' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Descripción del material' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Antes de comprar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contactar al vendedor' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tu mensaje')).toHaveClass('marketplace-inquiry-textarea')
    expect(document.querySelector('.marketplace-contact-meta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar consulta' })).toHaveClass('marketplace-inquiry-submit')
    expect(screen.getByRole('button', { name: 'Foto anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver foto 2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al catálogo' }))
    expect(window.location.pathname).toBe('/materiales')
  })

  it('does not show publish or account shortcuts in the catalog header', async () => {
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vender materiales' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mis anuncios' })).not.toBeInTheDocument()
  })

  it.each(['Contactar', 'Consultar'])('%s uses the direct contact action without navigating to the listing first', async (action) => {
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()
    const pushState = vi.spyOn(window.history, 'pushState')

    fireEvent.click(screen.getByRole('button', { name: action }))

    expect(window.location.pathname).toBe('/materiales')
    expect(pushState).not.toHaveBeenCalled()
    pushState.mockRestore()
  })

  it('keeps filters, map, and current results mounted while refreshing', async () => {
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()

    const initialPath = window.location.pathname
    const pushState = vi.spyOn(window.history, 'pushState')
    const nextRequest = deferred<{ items: Array<typeof listing>; total: number }>()
    vi.mocked(fetchMaterialListings).mockReturnValueOnce(nextRequest.promise)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar material' }), { target: { value: 'cemento' } })

    expect(screen.getByRole('searchbox', { name: 'Buscar material' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar mapa' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(initialPath)
    expect(pushState).not.toHaveBeenCalled()
    expect(screen.getByText('Cemento gris')).toBeInTheDocument()
    expect(screen.getByText('1 anuncio disponible')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Actualizando materiales' })).toBeInTheDocument()
    expect(screen.queryByRole('main', { name: 'Cargando materiales' })).not.toBeInTheDocument()

    nextRequest.resolve({ items: [listing], total: 1 })
    await waitFor(() => expect(screen.getByText('Cemento gris')).toBeInTheDocument())
    pushState.mockRestore()
  })

  it('fetches a numbered server page instead of appending more listings', async () => {
    vi.mocked(fetchMaterialListings).mockResolvedValueOnce({ items: [listing], total: 31 })
    const nextRequest = deferred<{ items: Array<typeof listing>; total: number }>()
    vi.mocked(fetchMaterialListings).mockReturnValueOnce(nextRequest.promise)
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()

    expect(screen.getByRole('navigation', { name: 'Paginación del catálogo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cargar más anuncios' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(screen.getByText('Cemento gris')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Actualizando materiales' })).toBeInTheDocument()
    expect(fetchMaterialListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 15, pageSize: 15 }))

    const secondListing = { ...listing, id: 'material-2', slug: 'segundo', title: 'Segundo material' }
    nextRequest.resolve({ items: [secondListing], total: 31 })
    expect(await screen.findByText('Segundo material')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    vi.mocked(fetchMaterialListings).mockResolvedValueOnce({ items: [listing], total: 1 })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar material' }), { target: { value: 'cemento' } })
    await waitFor(() => expect(fetchMaterialListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, pageSize: 15 })))
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()
  })

  it('applies a map province without navigation and resets to the first page', async () => {
    vi.mocked(fetchMaterialListings).mockResolvedValueOnce({ items: [listing], total: 31 })
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    await waitFor(() => expect(fetchMaterialListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 15, pageSize: 15 })))
    const initialPath = window.location.pathname
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mapa' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Filtrar Matanzas en el mapa' }))

    await waitFor(() => expect(fetchMaterialListings).toHaveBeenLastCalledWith(expect.objectContaining({
      province: 'Matanzas', offset: 0, pageSize: 15,
    })))
    expect(screen.getByText('Mapa de materiales: Matanzas')).toBeInTheDocument()
    expect(window.location.pathname).toBe(initialPath)
  })

  it('prioritizes the first two listing photos and defers the rest', async () => {
    const image = 'https://images.unsplash.com/photo-456?auto=format'
    vi.mocked(fetchMaterialListings).mockResolvedValueOnce({
      items: [0, 1, 2].map((index) => ({
        ...listing,
        id: `material-${index}`,
        slug: `material-${index}`,
        title: `Material ${index}`,
        photoUrls: [image],
      })),
      total: 3,
    })
    const { container } = render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)

    await screen.findByText('Material 0')
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

  it('shows the shared photo carousel when a material has multiple photos', async () => {
    vi.mocked(fetchMaterialListings).mockResolvedValueOnce({
      items: [{ ...listing, photoUrls: ['https://example.com/material-1.jpg', 'https://example.com/material-2.jpg'] }],
      total: 1,
    })
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} />)

    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Fotos de Cemento gris' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver foto 2' })).toBeInTheDocument()
    expect(screen.getByText('12,00 US$')).toBeInTheDocument()
  })
})
