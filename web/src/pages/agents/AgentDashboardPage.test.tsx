import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentDashboardPage } from './AgentDashboardPage'
import { loadAgentDashboard, setOwnerPropertyVisibility } from '../../modules/agents/agentDashboardRepository'

vi.mock('../../modules/agents/agentDashboardRepository', () => ({
  loadAgentDashboard: vi.fn(),
  setOwnerPropertyVisibility: vi.fn(),
}))

const properties = [
  { id: 'prop-1', title: 'Apartamento de Lujo en El Vedado', location: 'Vedado, La Habana', price_usd: 120000, cover_image: null, status: 'published', created_at: '2026-07-21', user_id: 'agent-123', view_count: 350 },
  { id: 'prop-2', title: 'Casa Colonial con Garaje', location: 'Playa, La Habana', price_usd: 85000, cover_image: null, status: 'published', created_at: '2026-07-20', user_id: 'agent-123', view_count: 150 },
  { id: 'prop-3', title: 'Terreno Urbanizable', location: 'Miramar, La Habana', price_usd: 45000, cover_image: null, status: 'paused', created_at: '2026-07-19', user_id: 'agent-123', view_count: 0 },
] as const

const mockUser = { id: 'agent-123', email: 'agente@cubitat.cu', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-07-21' } as never

describe('AgentDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'user', isVerifiedAgent: true, properties: [...properties] })
    vi.mocked(setOwnerPropertyVisibility).mockResolvedValue('owner_hidden')
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders metrics from the verified owner properties', async () => {
    render(<AgentDashboardPage user={mockUser} />)
    await waitFor(() => expect(screen.getByTestId('metric-active-properties')).toHaveTextContent('2'))
    expect(screen.getByTestId('metric-total-views')).toHaveTextContent('500')
    expect(screen.getByTestId('metric-estimated-leads')).toHaveTextContent('25')
  })

  it('denies the dashboard to a user without verified agent status', async () => {
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'user', isVerifiedAgent: false, properties: [] })
    render(<AgentDashboardPage user={mockUser} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('únicamente para agentes verificados')
  })

  it('shows a safe load error', async () => {
    vi.mocked(loadAgentDashboard).mockRejectedValue(new Error('private backend details'))
    render(<AgentDashboardPage user={mockUser} />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo cargar')
    expect(alert).not.toHaveTextContent('private backend details')
  })

  it('filters properties by search and status', async () => {
    render(<AgentDashboardPage user={mockUser} />)
    await screen.findByText('Apartamento de Lujo en El Vedado')
    fireEvent.change(screen.getByPlaceholderText(/buscar por/i), { target: { value: 'Vedado' } })
    expect(screen.queryByText('Casa Colonial con Garaje')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/buscar por/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /pausadas \(1\)/i }))
    expect(screen.getByText('Terreno Urbanizable')).toBeInTheDocument()
  })

  it('uses owner-hidden rather than the moderation paused state', async () => {
    render(<AgentDashboardPage user={mockUser} />)
    await screen.findByText('Apartamento de Lujo en El Vedado')
    fireEvent.click(screen.getAllByRole('button', { name: /ocultar/i })[0])
    await waitFor(() => expect(setOwnerPropertyVisibility).toHaveBeenCalledWith('prop-1', 'agent-123', 'published'))
  })

  it('does not let the owner reactivate a moderation-paused property', async () => {
    render(<AgentDashboardPage user={mockUser} />)
    await screen.findByText('Terreno Urbanizable')
    expect(screen.getByText('Gestionada por moderación')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reactivar/i })).not.toBeInTheDocument()
  })
})
