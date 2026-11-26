import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentGrowthPanel } from './AgentGrowthPanel'
import { ensureAgentReferralCode, loadAgentReferralCode } from '../referrals/agentReferralRepository'
import { loadAgentAcquisitionMetrics } from '../referrals/agentAcquisitionMetricsRepository'

vi.mock('../referrals/agentReferralRepository', () => ({
  ensureAgentReferralCode: vi.fn(),
  loadAgentReferralCode: vi.fn(),
  getAgentReferralLink: (code: string) => `https://cubitat.example/?ref=${code}`,
}))
vi.mock('../referrals/agentAcquisitionMetricsRepository', () => ({
  loadAgentAcquisitionMetrics: vi.fn(),
}))

describe('AgentGrowthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentReferralCode).mockResolvedValue(null)
    vi.mocked(loadAgentAcquisitionMetrics).mockResolvedValue({ registeredUsers: 0, paidUsers: null })
    vi.mocked(ensureAgentReferralCode).mockResolvedValue('AG-12AB34CD')
  })

  it('focuses on user acquisition without opportunity tools', async () => {
    render(<AgentGrowthPanel />)

    expect(await screen.findByRole('heading', { name: 'Captación de usuarios' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Invita personas a crear su cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear mi enlace' })).toBeInTheDocument()
    expect(screen.queryByText(/oportunidades/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/propiedades captadas/i)).not.toBeInTheDocument()
  })

  it('shows referral signups from the server and does not invent payment counts', async () => {
    vi.mocked(loadAgentAcquisitionMetrics).mockResolvedValue({ registeredUsers: 7, paidUsers: null })
    render(<AgentGrowthPanel />)

    expect(await screen.findByRole('heading', { name: 'Usuarios captados' })).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Usuarios con plan pagado')).toBeInTheDocument()
    expect(screen.getByText('Aún no disponible')).toBeInTheDocument()
    expect(screen.getByText(/El cobro de planes todavía no está habilitado/i)).toBeInTheDocument()
  })

  it('does not show a fabricated zero when the signup count cannot be loaded', async () => {
    vi.mocked(loadAgentAcquisitionMetrics).mockRejectedValue(new Error('private backend details'))
    render(<AgentGrowthPanel />)

    expect(await screen.findByText('No se pudieron cargar los usuarios captados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar conteo' })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('creates a referral link only after the agent explicitly asks for it', async () => {
    render(<AgentGrowthPanel />)
    fireEvent.click(await screen.findByRole('button', { name: 'Crear mi enlace' }))

    expect(await screen.findByLabelText('Tu enlace de registro')).toHaveValue('https://cubitat.example/?ref=AG-12AB34CD')
    expect(ensureAgentReferralCode).toHaveBeenCalledOnce()
  })

  it('restores the server-saved link after reloading without creating another', async () => {
    vi.mocked(loadAgentReferralCode).mockResolvedValueOnce('AG-12AB34CD')
    render(<AgentGrowthPanel />)

    expect(await screen.findByLabelText('Tu enlace de registro')).toHaveValue('https://cubitat.example/?ref=AG-12AB34CD')
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
    expect(ensureAgentReferralCode).not.toHaveBeenCalled()
  })

  it('offers a retry when the saved referral link cannot be recovered', async () => {
    vi.mocked(loadAgentReferralCode)
      .mockRejectedValueOnce(new Error('private backend details'))
      .mockResolvedValueOnce('AG-12AB34CD')
    render(<AgentGrowthPanel />)

    expect(await screen.findByText('No se pudo recuperar el enlace guardado. Vuelve a cargar el panel.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Tu enlace de registro')).toHaveValue('https://cubitat.example/?ref=AG-12AB34CD')
    await waitFor(() => expect(loadAgentReferralCode).toHaveBeenCalledTimes(2))
  })
})
