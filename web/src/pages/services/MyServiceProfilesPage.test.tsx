import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyServiceProfilesPage } from './MyServiceProfilesPage'
import { fetchMyHomeServiceProviders } from '../../modules/home-services/homeServiceRepository'

vi.mock('../../modules/home-services/homeServiceRepository', () => ({
  fetchMyHomeServiceProviders: vi.fn(),
}))
vi.mock('../../shared/config/features', () => ({ PHASE_TWO_ENABLED: true }))

describe('MyServiceProfilesPage account navigation', () => {
  beforeEach(() => {
    vi.mocked(fetchMyHomeServiceProviders).mockResolvedValue([])
  })

  it('keeps the agent dashboard in the account sidebar', async () => {
    render(
      <MyServiceProfilesPage
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateMyServices={vi.fn()}
        onNavigateAgentDashboard={vi.fn()}
        userRole="agent"
      />,
    )

    await screen.findByText('Todavía no tienes perfiles de servicios')
    expect(within(screen.getByRole('navigation', { name: 'Navegacion de cuenta' }))
      .getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
  })

  it('presents service profiles in the shared publications layout and filters by status', async () => {
    vi.mocked(fetchMyHomeServiceProviders).mockResolvedValue([
      {
        id: 'published-service', slug: 'published-service', displayName: 'Plomería en La Habana',
        category: 'plomeria', description: 'Reparación de tuberías', province: 'La Habana',
        municipalities: ['Plaza'], coordinates: null, phone: null, whatsapp: null,
        galleryUrls: [], galleryReferences: [], updatedAt: '2026-11-27T12:00:00.000Z', status: 'published',
      },
      {
        id: 'pending-service', slug: 'pending-service', displayName: 'Electricidad en Matanzas',
        category: 'electricidad', description: 'Instalaciones eléctricas', province: 'Matanzas',
        municipalities: ['Matanzas'], coordinates: null, phone: null, whatsapp: null,
        galleryUrls: [], galleryReferences: [], updatedAt: '2026-11-27T12:00:00.000Z', status: 'pending_review',
      },
    ])

    render(
      <MyServiceProfilesPage
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateMyServices={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Mis servicios' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Mis servicios' })).toHaveTextContent('2 perfiles')
    expect(screen.getByRole('button', { name: 'Crear perfil' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filtrar servicios por estado' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Publicados 1' }))
    expect(screen.getByText('Plomería en La Habana')).toBeInTheDocument()
    expect(screen.queryByText('Electricidad en Matanzas')).not.toBeInTheDocument()
  })
})
