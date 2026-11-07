import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentDashboardPage } from './AgentDashboardPage'
import { loadAgentDashboard, setOwnerPropertyVisibility } from '../../modules/agents/agentDashboardRepository'

vi.mock('../../modules/agents/agentDashboardRepository', () => ({
  loadAgentDashboard: vi.fn(),
  setOwnerPropertyVisibility: vi.fn(),
}))
vi.mock('../../shared/config/features', () => ({ PHASE_TWO_ENABLED: true }))

const properties = [
  { id: 'prop-1', title: 'Apartamento de Lujo en El Vedado', location: 'Vedado, La Habana', price_usd: 120000, cover_image: null, status: 'published', created_at: '2026-07-21', user_id: 'agent-123', view_count: 350, phone_clicks_count: 2, whatsapp_clicks_count: 4 },
  { id: 'prop-2', title: 'Casa Colonial con Garaje', location: 'Playa, La Habana', price_usd: 85000, cover_image: null, status: 'published', created_at: '2026-07-20', user_id: 'agent-123', view_count: 150, phone_clicks_count: 1, whatsapp_clicks_count: 3 },
  { id: 'prop-3', title: 'Terreno Urbanizable', location: 'Miramar, La Habana', price_usd: 45000, cover_image: null, status: 'paused', created_at: '2026-07-19', user_id: 'agent-123', view_count: 0, phone_clicks_count: 0, whatsapp_clicks_count: 1 },
] as const

const mockUser = { id: 'agent-123', email: 'agente@cubitat.cu', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-07-21' } as never

describe('AgentDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'user', isVerifiedAgent: true, properties: [...properties], contactMetricsAvailable: true })
    vi.mocked(setOwnerPropertyVisibility).mockResolvedValue('owner_hidden')
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders metrics from the verified owner properties', async () => {
    render(<AgentDashboardPage user={mockUser} />)
    await waitFor(() => expect(screen.getByTestId('metric-active-properties')).toHaveTextContent('2'))
    expect(screen.getByTestId('metric-total-views')).toHaveTextContent('500')
    expect(screen.getByTestId('metric-contact-clicks')).toHaveTextContent('11')
    expect(screen.queryByText(/5% conv/i)).not.toBeInTheDocument()
  })

  it('keeps listings visible and marks contact metrics unavailable when their RPC fails', async () => {
    vi.mocked(loadAgentDashboard).mockResolvedValue({
      role: 'agent', isVerifiedAgent: true, contactMetricsAvailable: false,
      properties: [{ ...properties[0], phone_clicks_count: undefined, whatsapp_clicks_count: undefined }],
    })
    render(<AgentDashboardPage user={mockUser} />)

    expect(await screen.findByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    expect(screen.getByTestId('metric-contact-clicks')).toHaveTextContent('—')
    expect(screen.getByTestId('metric-contact-clicks').nextElementSibling).toHaveTextContent('Métricas de contacto no disponibles')
  })

  it('renders the panel navigation for a verified administrator acting as agent', async () => {
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'admin', isVerifiedAgent: true, properties: [], contactMetricsAvailable: true })
    render(<AgentDashboardPage user={mockUser} />)

    expect(within(await screen.findByRole('navigation', { name: 'Navegación de cuenta móvil' })).getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Métricas y Rendimiento' })).toBeInTheDocument()
  })

  it('denies the dashboard to a user without verified agent status', async () => {
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'user', isVerifiedAgent: false, properties: [], contactMetricsAvailable: false })
    const onNavigateAccount = vi.fn()
    render(<AgentDashboardPage user={mockUser} onNavigateAccount={onNavigateAccount} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('verificación KYC aprobada')
    fireEvent.click(screen.getByRole('button', { name: 'Revisar mi cuenta' }))
    expect(onNavigateAccount).toHaveBeenCalledOnce()
  })

  it('shows a safe load error and retries the profile/dashboard request', async () => {
    vi.mocked(loadAgentDashboard).mockRejectedValue(new Error('private backend details'))
    render(<AgentDashboardPage user={mockUser} />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo cargar')
    expect(alert).not.toHaveTextContent('private backend details')
    vi.mocked(loadAgentDashboard).mockResolvedValue({ role: 'agent', isVerifiedAgent: true, properties: [], contactMetricsAvailable: true })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Métricas y Rendimiento' })).toBeInTheDocument()
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
