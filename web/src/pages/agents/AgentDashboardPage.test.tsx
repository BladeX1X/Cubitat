import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentDashboardPage } from './AgentDashboardPage'
import { loadAgentDashboard } from '../../modules/agents/agentDashboardRepository'

vi.mock('../../modules/agents/agentDashboardRepository', () => ({
  loadAgentDashboard: vi.fn(),
  setOwnerPropertyVisibility: vi.fn(),
}))
vi.mock('../../shared/config/features', () => ({ PHASE_TWO_ENABLED: true }))

const mockUser = { id: 'agent-123', email: 'agente@cubitat.cu', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-07-21' } as never

describe('AgentDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'agent', isVerifiedAgent: true, properties: [], contactMetricsAvailable: true })
  })

  it('keeps the agent dashboard focused on acquisition, without property management', async () => {
    render(<AgentDashboardPage user={mockUser} />)

    expect(within(await screen.findByRole('navigation', { name: 'Navegación de cuenta móvil' })).getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Publicaciones del Agente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Métricas y Rendimiento' })).not.toBeInTheDocument()
  })

  it('denies the dashboard to a user without verified agent status', async () => {
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'user', isVerifiedAgent: false, properties: [], contactMetricsAvailable: false })
    const onNavigateAccount = vi.fn()
    render(<AgentDashboardPage user={mockUser} onNavigateAccount={onNavigateAccount} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('verificación KYC aprobada')
    fireEvent.click(screen.getByRole('button', { name: 'Revisar mi cuenta' }))
    expect(onNavigateAccount).toHaveBeenCalledOnce()
  })

  it('shows a safe load error and retries the profile request', async () => {
    vi.mocked(loadAgentDashboard).mockRejectedValueOnce(new Error('private backend details'))
    render(<AgentDashboardPage user={mockUser} />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo cargar')
    expect(alert).not.toHaveTextContent('private backend details')
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'agent', isVerifiedAgent: true, properties: [], contactMetricsAvailable: true })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(loadAgentDashboard).toHaveBeenCalledTimes(2))
  })
})
