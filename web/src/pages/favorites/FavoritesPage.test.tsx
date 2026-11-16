import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FavoritesPage } from './FavoritesPage'

const mocks = vi.hoisted(() => ({
  savedPropertyState: {
    savedPropertyIds: new Set<string>(),
    loading: false,
    error: null as string | null,
    retryLoad: vi.fn(),
  },
  savedMarketplaceState: {
    savedServiceIds: new Set(['service-1']),
    savedMaterialIds: new Set(['material-1']),
    loading: false,
    error: null as string | null,
    retryLoad: vi.fn(),
  },
}))

vi.mock('../../modules/properties/hooks/useSavedProperties', () => ({
  useSavedProperties: () => mocks.savedPropertyState,
}))
vi.mock('../../modules/marketplace/hooks/useSavedMarketplaceListings', () => ({
  useSavedMarketplaceListings: () => mocks.savedMarketplaceState,
}))
vi.mock('../../modules/home-services/homeServiceRepository', () => ({
  fetchHomeServiceProvidersByIds: vi.fn(async (ids: string[]) => ids.includes('service-1') ? [{
    id: 'service-1', slug: 'electricista', displayName: 'Electricista', category: 'electricidad', description: 'Servicio', province: 'La Habana', municipalities: [], galleryUrls: [], updatedAt: '2026-11-11',
  }] : []),
}))
vi.mock('../../modules/materials/materialRepository', () => ({
  fetchMaterialListingsByIds: vi.fn(async (ids: string[]) => ids.includes('material-1') ? [{
    id: 'material-1', slug: 'cemento', title: 'Cemento', category: 'cemento', description: 'Material', price: 10, currency: 'USD', province: 'Matanzas', availability: 'available', photoUrls: [], updatedAt: '2026-11-11',
  }] : []),
}))
vi.mock('../../shared/ui/SaveMarketplaceListingButton', () => ({ SaveMarketplaceListingButton: ({ listingTitle }: { listingTitle: string }) => <button aria-label={`Quitar ${listingTitle} de favoritos`}>♥</button> }))

describe('FavoritesPage', () => {
  beforeEach(() => {
    mocks.savedPropertyState.savedPropertyIds = new Set()
    mocks.savedPropertyState.loading = false
    mocks.savedPropertyState.error = null
    mocks.savedPropertyState.retryLoad.mockClear()
    mocks.savedMarketplaceState.savedServiceIds = new Set(['service-1'])
    mocks.savedMarketplaceState.savedMaterialIds = new Set(['material-1'])
    mocks.savedMarketplaceState.loading = false
    mocks.savedMarketplaceState.error = null
    mocks.savedMarketplaceState.retryLoad.mockClear()
  })

  it('muestra servicios y materiales guardados en la lista de favoritos', async () => {
    const { container } = render(
      <FavoritesPage
        properties={[]}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onSelectProperty={vi.fn()}
        onGoResults={vi.fn()}
        onOpenService={vi.fn()}
        onOpenMaterial={vi.fn()}
        onGoServices={vi.fn()}
        onGoMaterials={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { name: /electricista/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /cemento/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar electricista de favoritos/i })).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('abre el detalle del servicio o material seleccionado', async () => {
    const onOpenService = vi.fn()
    const onOpenMaterial = vi.fn()
    render(
      <FavoritesPage
        properties={[]}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onSelectProperty={vi.fn()}
        onGoResults={vi.fn()}
        onOpenService={onOpenService}
        onOpenMaterial={onOpenMaterial}
        onGoServices={vi.fn()}
        onGoMaterials={vi.fn()}
      />,
    )
    fireEvent.click(await screen.findByRole('heading', { name: 'Electricista' }))
    fireEvent.click(screen.getByRole('heading', { name: 'Cemento' }))
    await waitFor(() => {
      expect(onOpenService).toHaveBeenCalledWith('electricista')
      expect(onOpenMaterial).toHaveBeenCalledWith('cemento')
    })
  })

  it('no confunde un fallo al cargar IDs guardados con una lista vacía y permite reintentar', async () => {
    mocks.savedMarketplaceState.savedServiceIds = new Set()
    mocks.savedMarketplaceState.savedMaterialIds = new Set()
    mocks.savedMarketplaceState.error = 'No se pudieron cargar tus favoritos de Servicios y Materiales. Comprueba la conexión e inténtalo de nuevo.'
    render(
      <FavoritesPage
        properties={[]}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onSelectProperty={vi.fn()}
        onGoResults={vi.fn()}
        onOpenService={vi.fn()}
        onOpenMaterial={vi.fn()}
        onGoServices={vi.fn()}
        onGoMaterials={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudieron cargar tus favoritos/i)
    expect(screen.queryByRole('heading', { name: /todavía no tienes favoritos/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(mocks.savedMarketplaceState.retryLoad).toHaveBeenCalledOnce()
  })

  it('no muestra una lista vacía cuando falló la carga de favoritos de propiedades', async () => {
    mocks.savedPropertyState.error = 'No se pudieron cargar tus favoritos. Comprueba la conexión e inténtalo de nuevo.'
    mocks.savedMarketplaceState.savedServiceIds = new Set()
    mocks.savedMarketplaceState.savedMaterialIds = new Set()
    render(
      <FavoritesPage
        properties={[]}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onSelectProperty={vi.fn()}
        onGoResults={vi.fn()}
        onOpenService={vi.fn()}
        onOpenMaterial={vi.fn()}
        onGoServices={vi.fn()}
        onGoMaterials={vi.fn()}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudieron cargar tus favoritos/i)
    expect(screen.queryByRole('heading', { name: /todavía no tienes favoritos/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(mocks.savedPropertyState.retryLoad).toHaveBeenCalledOnce()
    expect(mocks.savedMarketplaceState.retryLoad).toHaveBeenCalledOnce()
  })
})
