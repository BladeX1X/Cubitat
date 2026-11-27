import { render, screen, within } from '@testing-library/react'
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
        onBack={vi.fn()}
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
})
