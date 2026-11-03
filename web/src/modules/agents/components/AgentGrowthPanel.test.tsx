import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentGrowthPanel } from './AgentGrowthPanel'
import { createAgentLead, loadAgentGrowthDashboard, updateAgentLeadStatus } from '../agentGrowthRepository'
import { ensureAgentReferralCode } from '../referrals/agentReferralRepository'

vi.mock('../agentGrowthRepository', () => ({
  createAgentLead: vi.fn(),
  loadAgentGrowthDashboard: vi.fn(),
  updateAgentLeadStatus: vi.fn(),
}))

vi.mock('../referrals/agentReferralRepository', () => ({
  ensureAgentReferralCode: vi.fn(),
  getAgentReferralLink: (code: string) => `https://cubitat.example/?ref=${code}`,
}))

describe('AgentGrowthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentGrowthDashboard).mockResolvedValue({
      referralCode: 'AG-12AB34CD', leads: [], contacts: [], commissions: [], leadEvents: [], commissionEvents: [], referralVisits: 4, failedModules: [], failureCodes: {},
    })
    vi.mocked(createAgentLead).mockResolvedValue(undefined)
    vi.mocked(updateAgentLeadStatus).mockResolvedValue(undefined)
    vi.mocked(ensureAgentReferralCode).mockResolvedValue('AG-12AB34CD')
  })

  it('shows opportunity management while referral and commission policy is pending', async () => {
    render(<AgentGrowthPanel />)
    expect(await screen.findByRole('heading', { name: 'Oportunidades' })).toBeInTheDocument()
    const formToggle = screen.getByRole('button', { name: 'Registrar una oportunidad' })
    const leadsToggle = screen.getByRole('button', { name: 'Propiedades captadas y clientes referidos' })
    expect(formToggle).toHaveAttribute('aria-expanded', 'false')
    expect(leadsToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Nombre de contacto')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Registrar una oportunidad'))
    expect(await screen.findByLabelText('Nombre de contacto')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Invita personas a crear su cuenta' })).toBeInTheDocument()
    expect(screen.queryByText('Visitas a tu enlace')).not.toBeInTheDocument()
    expect(screen.queryByText('Comisiones')).not.toBeInTheDocument()
    fireEvent.click(leadsToggle)
    expect(screen.getByText('Aún no registras oportunidades.')).toBeInTheDocument()
  })

  it('creates a referral link only after the agent explicitly asks for it', async () => {
    render(<AgentGrowthPanel />)
    expect(await screen.findByRole('heading', { name: 'Oportunidades' })).toBeInTheDocument()
    expect(ensureAgentReferralCode).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi enlace' }))
    expect(await screen.findByLabelText('Tu enlace de registro')).toHaveValue('https://cubitat.example/?ref=AG-12AB34CD')
    expect(ensureAgentReferralCode).toHaveBeenCalledTimes(1)
  })

  it('requires confirmation of prospect permission before creating a property lead', async () => {
    render(<AgentGrowthPanel />)
    await screen.findByRole('heading', { name: 'Oportunidades' })
    fireEvent.click(screen.getByText('Registrar una oportunidad'))
    fireEvent.change(screen.getByLabelText('Nombre de contacto'), { target: { value: 'Ana Pérez' } })
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+5351234567' } })
    fireEvent.change(screen.getByLabelText('Nombre breve de la propiedad'), { target: { value: 'Casa en Centro Habana' } })
    fireEvent.change(screen.getByLabelText('Zona o municipio'), { target: { value: 'Centro Habana' } })

    const submit = screen.getByRole('button', { name: 'Guardar oportunidad' })
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(createAgentLead).toHaveBeenCalledWith(expect.objectContaining({
      leadType: 'property', contactName: 'Ana Pérez', consentConfirmed: true,
    })))
  })

  it('explains when the daily opportunity limit has been reached', async () => {
    vi.mocked(createAgentLead).mockRejectedValueOnce(new Error('agent_lead_limit_reached'))
    render(<AgentGrowthPanel />)
    await screen.findByRole('heading', { name: 'Oportunidades' })
    fireEvent.click(screen.getByText('Registrar una oportunidad'))
    fireEvent.change(screen.getByLabelText('Nombre de contacto'), { target: { value: 'Ana Pérez' } })
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+5351234567' } })
    fireEvent.change(screen.getByLabelText('Nombre breve de la propiedad'), { target: { value: 'Casa en Centro Habana' } })
    fireEvent.change(screen.getByLabelText('Zona o municipio'), { target: { value: 'Centro Habana' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar oportunidad' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('límite de 20 oportunidades')
  })

  it('filters opportunities by type and exposes their event history', async () => {
    vi.mocked(loadAgentGrowthDashboard).mockResolvedValueOnce({
      referralCode: 'AG-12AB34CD',
      referralVisits: 0,
      leads: [{ id: 'lead-1', lead_type: 'property', contact_name: 'Ana Pérez', contact_phone: '+5351234567', property_title: 'Casa Centro Habana', location: 'La Habana', client_interest: null, notes: null, status: 'contacted', created_at: '2026-10-13T10:00:00Z' }],
      contacts: [], commissions: [],
      leadEvents: [{ id: 'event-1', lead_id: 'lead-1', from_status: 'new', to_status: 'contacted', actor_id: 'agent-1', note: 'Primera llamada', created_at: '2026-10-13T11:00:00Z' }],
      commissionEvents: [], failedModules: [], failureCodes: {},
    })
    render(<AgentGrowthPanel />)
    fireEvent.click(await screen.findByText('Propiedades captadas y clientes referidos'))
    await screen.findByText('Casa Centro Habana')
    fireEvent.click(screen.getByText('Historial de seguimiento'))
    expect(screen.getByText(/Primera llamada/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Filtrar oportunidades por tipo'), { target: { value: 'client' } })
    expect(screen.getByText('No hay oportunidades con estos filtros.')).toBeInTheDocument()
  })

  it('renders safe loading failures with retry', async () => {
    vi.mocked(loadAgentGrowthDashboard).mockRejectedValueOnce(new Error('private backend details'))
    render(<AgentGrowthPanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar tu actividad')
    expect(screen.queryByText('private backend details')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(loadAgentGrowthDashboard).toHaveBeenCalledTimes(2))
  })

  it('identifies an opportunity loading failure without showing deferred sections', async () => {
    vi.mocked(loadAgentGrowthDashboard).mockResolvedValueOnce({
      referralCode: 'AG-12AB34CD', leads: [], contacts: [], commissions: [], leadEvents: [], commissionEvents: [], referralVisits: 0, failedModules: ['leads'], failureCodes: { leads: 'PGRST116' },
    })
    render(<AgentGrowthPanel />)

    expect(await screen.findByText(/No se pudo cargar: Oportunidades/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('código PGRST116')
    expect(screen.getByRole('heading', { name: 'Invita personas a crear su cuenta' })).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
