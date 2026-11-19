import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it.each(['Contactar', 'Consultar'])('%s uses the direct contact action without navigating to the listing first', async (action) => {
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} onCreateListing={vi.fn()} onManageListings={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()
    const pushState = vi.spyOn(window.history, 'pushState')

    fireEvent.click(screen.getByRole('button', { name: action }))

    expect(window.location.pathname).toBe('/materiales')
    expect(pushState).not.toHaveBeenCalled()
    pushState.mockRestore()
  })

  it('keeps filters, map, and current results mounted while refreshing', async () => {
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} onCreateListing={vi.fn()} onManageListings={vi.fn()} />)
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

  it('shows no stale result count in the mobile filter sheet during a province refresh', async () => {
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} onCreateListing={vi.fn()} onManageListings={vi.fn()} />)
    expect(await screen.findByText('Cemento gris')).toBeInTheDocument()
    const nextRequest = deferred<{ items: Array<typeof listing>; total: number }>()
    vi.mocked(fetchMaterialListings).mockReturnValueOnce(nextRequest.promise)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar filtros de anuncios' }))
    const dialog = screen.getByRole('dialog', { name: 'Filtros de materiales' })
    fireEvent.change(within(dialog).getByLabelText('Provincia'), { target: { value: 'La Habana' } })

    expect(within(dialog).getByRole('button', { name: 'Ver resultados' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Ver 1 anuncios' })).not.toBeInTheDocument()

    nextRequest.resolve({ items: [listing], total: 6 })
    expect(await within(dialog).findByRole('button', { name: 'Ver 6 anuncios' })).toBeInTheDocument()
  })

  it('fetches a numbered server page instead of appending more listings', async () => {
    vi.mocked(fetchMaterialListings).mockResolvedValueOnce({ items: [listing], total: 31 })
    const nextRequest = deferred<{ items: Array<typeof listing>; total: number }>()
    vi.mocked(fetchMaterialListings).mockReturnValueOnce(nextRequest.promise)
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} onCreateListing={vi.fn()} onManageListings={vi.fn()} />)
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
    render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} onCreateListing={vi.fn()} onManageListings={vi.fn()} />)
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
    const { container } = render(<MaterialsMarketplacePage onRequireLogin={vi.fn()} onCreateListing={vi.fn()} onManageListings={vi.fn()} />)

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
})
