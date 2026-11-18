import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FavoritesPage } from './FavoritesPage'

const appCss = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8')

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
  useSavedProperties: () => ({
    ...mocks.savedPropertyState,
    sessionReady: true,
    isSaved: (id: string) => mocks.savedPropertyState.savedPropertyIds.has(id),
    toggleSave: vi.fn(),
  }),
}))
vi.mock('../../shared/config/features', async () => {
  const actual = await vi.importActual<typeof import('../../shared/config/features')>('../../shared/config/features')
  return { ...actual, PHASE_FOUR_SVC_ENABLED: true, PHASE_FOUR_MAT_ENABLED: true }
})
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

  it('filtra localmente propiedades, servicios y materiales sin navegar a los catálogos', async () => {
    const onGoResults = vi.fn()
    const onGoServices = vi.fn()
    const onGoMaterials = vi.fn()
    mocks.savedPropertyState.savedPropertyIds = new Set(['property-1'])
    render(
      <FavoritesPage
        properties={[{
          id: 'property-1', title: 'Casa guardada', location: 'Playa, La Habana',
          description: 'Casa de prueba', zoneId: 'playa', operation: 'venta',
          propertyType: 'casa', bedrooms: 2, bathrooms: 1, parking: 0, areaM2: 80,
          amenities: [], status: 'published', coverTone: '#eee', coverImage: '',
          mapPoint: { x: 0, y: 0 }, coordinates: { latitude: 0, longitude: 0 },
        }]}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onSelectProperty={vi.fn()}
        onGoResults={onGoResults}
        onOpenService={vi.fn()}
        onOpenMaterial={vi.fn()}
        onGoServices={onGoServices}
        onGoMaterials={onGoMaterials}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Electricista' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Casa guardada' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cemento' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Servicios' }))
    expect(screen.getByText('servicio guardado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Electricista' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cemento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Casa guardada' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Materiales' }))
    expect(screen.getByRole('heading', { name: 'Cemento' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Electricista' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Propiedades' }))
    expect(screen.getByText('propiedad guardada')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Casa guardada' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cemento' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Propiedades' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getByText('anuncios guardados')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Electricista' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cemento' })).toBeInTheDocument()
    expect(onGoResults).not.toHaveBeenCalled()
    expect(onGoServices).not.toHaveBeenCalled()
    expect(onGoMaterials).not.toHaveBeenCalled()
  })

  it('mantiene objetivos táctiles de 48 px para los filtros de favoritos', () => {
    expect(
      /@media \(any-pointer: coarse\) \{[\s\S]*?\.favorites-filter > button \{\s*min-height: 48px;\s*height: 48px;\s*\}/.test(appCss),
    ).toBe(true)
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
