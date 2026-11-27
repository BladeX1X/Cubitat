import { render, screen, within } from '@testing-library/react'
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
        onBack={vi.fn()}
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

    await screen.findByText('Todavía no tienes perfiles')
    expect(within(screen.getByRole('navigation', { name: 'Navegacion de cuenta' }))
      .getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
  })
})
