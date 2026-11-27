import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyMaterialListingsPage } from './MyMaterialListingsPage'
import { fetchMyMaterialListings } from '../../modules/materials/materialRepository'

vi.mock('../../modules/materials/materialRepository', () => ({
  fetchMyMaterialListings: vi.fn(),
}))
vi.mock('../../shared/config/features', () => ({ PHASE_TWO_ENABLED: true }))

describe('MyMaterialListingsPage account navigation', () => {
  beforeEach(() => {
    vi.mocked(fetchMyMaterialListings).mockResolvedValue([])
  })

  it('keeps the agent dashboard in the account sidebar', async () => {
    render(
      <MyMaterialListingsPage
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateMyMaterials={vi.fn()}
        onNavigateAgentDashboard={vi.fn()}
        userRole="agent"
      />,
    )

    await screen.findByText('Todavía no has publicado materiales')
    expect(within(screen.getByRole('navigation', { name: 'Navegacion de cuenta' }))
      .getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
  })

  it('presents materials in the shared publications layout and filters by status', async () => {
    vi.mocked(fetchMyMaterialListings).mockResolvedValue([
      {
        id: 'published-material', slug: 'published-material', title: 'Cemento gris',
        category: 'cemento', description: 'Sacos disponibles', price: 12.5, currency: 'USD',
        province: 'La Habana', coordinates: null, availability: 'available', phone: null,
        whatsapp: null, photoUrls: [], photoPaths: [], updatedAt: '2026-11-27T12:00:00.000Z',
        status: 'published',
      },
      {
        id: 'pending-material', slug: 'pending-material', title: 'Varilla corrugada',
        category: 'acero', description: 'Largo comercial', price: 100, currency: 'USD',
        province: 'Matanzas', coordinates: null, availability: 'limited', phone: null,
        whatsapp: null, photoUrls: [], photoPaths: [], updatedAt: '2026-11-27T12:00:00.000Z',
        status: 'pending_review',
      },
    ])

    render(
      <MyMaterialListingsPage
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateMyMaterials={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Mis materiales' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Mis materiales' })).toHaveTextContent('2 anuncios')
    expect(screen.getByRole('button', { name: 'Anunciar material' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filtrar materiales por estado' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Publicados 1' }))
    expect(screen.getByText('Cemento gris')).toBeInTheDocument()
    expect(screen.queryByText('Varilla corrugada')).not.toBeInTheDocument()
  })
})
