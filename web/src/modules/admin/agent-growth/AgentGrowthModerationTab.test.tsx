import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentGrowthModerationTab } from './AgentGrowthModerationTab'
import {
  addAgentCommission,
  changeAdminLeadStatus,
  changeAgentCommissionStatus,
  loadAgentGrowthOperations,
} from './agentGrowthRepository'

vi.mock('./agentGrowthRepository', () => ({
  addAgentCommission: vi.fn(),
  changeAdminLeadStatus: vi.fn(),
  changeAgentCommissionStatus: vi.fn(),
  loadAgentGrowthOperations: vi.fn(),
}))

describe('AgentGrowthModerationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadAgentGrowthOperations).mockResolvedValue({
      leads: [{
        id: 'lead-1', agent_id: 'agent-1', lead_type: 'client', contact_name: 'Ana Pérez', contact_phone: '+5351234567',
        property_title: null, location: null, client_interest: 'Compra', notes: null, status: 'converted', created_at: '2026-10-13',
      }],
      commissions: [],
      leadEvents: [{ id: 'event-1', lead_id: 'lead-1', from_status: 'qualified', to_status: 'converted', actor_id: 'admin-1', note: 'Contrato confirmado', created_at: '2026-10-13T12:00:00Z' }], commissionEvents: [], failedModules: [],
    })
    vi.mocked(addAgentCommission).mockResolvedValue(undefined)
    vi.mocked(changeAdminLeadStatus).mockResolvedValue(undefined)
    vi.mocked(changeAgentCommissionStatus).mockResolvedValue(undefined)
  })

  it('registers an auditable commission calculation for a converted lead', async () => {
    render(<AgentGrowthModerationTab />)
    await screen.findByText('Oportunidades registradas (1)')
    fireEvent.click(screen.getByText('Historial de seguimiento'))
    expect(screen.getByText(/Contrato confirmado/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Referencia de operación'), { target: { value: 'OP-2026-001' } })
    fireEvent.change(screen.getByLabelText('Monto elegible'), { target: { value: '1000.00' } })
    fireEvent.change(screen.getByLabelText('Tasa de comisión porcentual'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cálculo de comisión' }))

    await waitFor(() => expect(addAgentCommission).toHaveBeenCalledWith(expect.objectContaining({
      leadId: 'lead-1', operationReference: 'OP-2026-001', eligibleAmount: 1000, ratePercent: 5, currency: 'USD',
    })))
  })

  it('requires a reason before an opportunity is converted', async () => {
    vi.mocked(loadAgentGrowthOperations).mockResolvedValueOnce({
      leads: [{
        id: 'lead-2', agent_id: 'agent-1', lead_type: 'client', contact_name: 'Ana Pérez', contact_phone: '+5351234567',
        property_title: null, location: null, client_interest: 'Compra', notes: null, status: 'qualified', created_at: '2026-10-13',
      }],
      commissions: [],
      leadEvents: [], commissionEvents: [], failedModules: [],
    })
    render(<AgentGrowthModerationTab />)
    await screen.findByText('Oportunidades registradas (1)')
    fireEvent.change(screen.getByLabelText('Cambiar estado de Ana Pérez'), { target: { value: 'converted' } })
    expect(screen.getByText(/Añade el motivo/)).toBeInTheDocument()
    expect(changeAdminLeadStatus).not.toHaveBeenCalled()
  })

  it('requires a reason before an administrator reopens a lost opportunity', async () => {
    vi.mocked(loadAgentGrowthOperations).mockResolvedValueOnce({
      leads: [{
        id: 'lead-lost', agent_id: 'agent-1', lead_type: 'client', contact_name: 'Ana Pérez', contact_phone: '+5351234567',
        property_title: null, location: null, client_interest: 'Compra', notes: null, status: 'lost', created_at: '2026-10-13',
      }],
      commissions: [], leadEvents: [], commissionEvents: [], failedModules: [],
    })
    render(<AgentGrowthModerationTab />)
    await screen.findByText('Oportunidades registradas (1)')

    fireEvent.change(screen.getByLabelText('Cambiar estado de Ana Pérez'), { target: { value: 'contacted' } })
    expect(screen.getByText(/motivo antes de convertir, cerrar o reabrir/)).toBeInTheDocument()
    expect(changeAdminLeadStatus).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Motivo de cambio para Ana Pérez'), { target: { value: 'Contacto confirmado de nuevo' } })
    fireEvent.change(screen.getByLabelText('Cambiar estado de Ana Pérez'), { target: { value: 'contacted' } })
    await waitFor(() => expect(changeAdminLeadStatus).toHaveBeenCalledWith('lead-lost', 'contacted', 'Contacto confirmado de nuevo'))
  })

  it('keeps the commission section available when lead reads fail', async () => {
    vi.mocked(loadAgentGrowthOperations).mockResolvedValueOnce({
      leads: [], commissions: [], leadEvents: [], commissionEvents: [], failedModules: ['leads'],
    })
    render(<AgentGrowthModerationTab />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Oportunidades')
    expect(screen.getByText('Oportunidades registradas (—)')).toBeInTheDocument()
    expect(screen.getByText('Libro de comisiones (0)')).toBeInTheDocument()
    expect(screen.getByText(/No hay cálculos registrados/)).toBeInTheDocument()
  })
})
