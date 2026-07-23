import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AgentProfilePage } from './AgentProfilePage'
import * as agentRepo from '../../modules/agents/agentRepository'

vi.mock('../../modules/agents/agentRepository')

describe('AgentProfilePage', () => {
  it('renders agent profile and properties successfully', async () => {
    vi.mocked(agentRepo.fetchAgentProfile).mockResolvedValueOnce({
      id: 'agent-123',
      full_name: 'María Gutiérrez',
      agency_name: 'Habana Inmobiliaria',
      phone: '+5355555555',
      bio: 'Especialista en propiedades en Vedado y Playa.',
      license_number: 'LIC-9988',
      verification_status: 'verified',
      created_at: new Date().toISOString(),
      active_properties_count: 1,
      reports_count: 0,
    })

    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValueOnce([
      {
        id: 'p1',
        title: 'Apartamento de lujo en Miramar',
        location: 'Playa, La Habana',
        priceUsd: 85000,
        coverImage: '',
        status: 'published',
      },
    ])

    render(<AgentProfilePage agentId="agent-123" onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('María Gutiérrez')).toBeInTheDocument()
      expect(screen.getByText('Habana Inmobiliaria')).toBeInTheDocument()
      expect(screen.getByText('Apartamento de lujo en Miramar')).toBeInTheDocument()
    })
  })

  it('renders not found state when agent does not exist', async () => {
    vi.mocked(agentRepo.fetchAgentProfile).mockResolvedValueOnce(null)
    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValueOnce([])

    render(<AgentProfilePage agentId="invalid-agent" onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Agente no encontrado')).toBeInTheDocument()
    })
  })

  it('renders a distinct error state when loading fails', async () => {
    vi.mocked(agentRepo.fetchAgentProfile).mockRejectedValueOnce(new Error('network'))
    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValueOnce([])

    render(<AgentProfilePage agentId="agent-123" onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar el perfil')).toBeInTheDocument()
      expect(screen.queryByText('Agente no encontrado')).not.toBeInTheDocument()
    })
  })

  it('ignores an obsolete response after the agent id changes', async () => {
    let resolveFirst: ((value: Awaited<ReturnType<typeof agentRepo.fetchAgentProfile>>) => void) | undefined
    const firstProfile = new Promise<Awaited<ReturnType<typeof agentRepo.fetchAgentProfile>>>((resolve) => {
      resolveFirst = resolve
    })

    vi.mocked(agentRepo.fetchAgentProfile)
      .mockReturnValueOnce(firstProfile)
      .mockResolvedValueOnce({
        id: 'agent-new',
        full_name: 'Agente Nuevo',
        verification_status: 'verified',
        created_at: new Date().toISOString(),
        active_properties_count: 0,
        reports_count: 0,
      })
    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValue([])

    const { rerender } = render(<AgentProfilePage agentId="agent-old" onBack={vi.fn()} />)
    rerender(<AgentProfilePage agentId="agent-new" onBack={vi.fn()} />)

    await screen.findByText('Agente Nuevo')
    resolveFirst?.({
      id: 'agent-old',
      full_name: 'Agente Obsoleto',
      verification_status: 'verified',
      created_at: new Date().toISOString(),
      active_properties_count: 0,
      reports_count: 0,
    })

    await waitFor(() => expect(screen.queryByText('Agente Obsoleto')).not.toBeInTheDocument())
  })
})
