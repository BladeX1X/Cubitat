import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AgentProfilePage } from './AgentProfilePage'
import * as agentRepo from '../../modules/agents/agentRepository'

vi.mock('../../modules/agents/agentRepository')

describe('AgentProfilePage', () => {
  it('renders agent profile and properties successfully', async () => {
    vi.mocked(agentRepo.fetchAgentProfile).mockResolvedValueOnce(Object.assign({
      id: 'agent-123',
      full_name: 'María Gutiérrez',
      agency_name: 'Habana Inmobiliaria',
      phone: '+5355555555',
      bio: 'Especialista en propiedades en Vedado y Playa.',
      verification_status: 'verified' as const,
      created_at: new Date().toISOString(),
      active_properties_count: 1,
    }, { license_number: 'LIC-9988' }))

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
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveClass('min-h-11')
    expect(screen.getByRole('link', { name: 'Contactar por WhatsApp' })).toHaveClass('min-h-11')
    expect(screen.queryByText(/Licencia \/ Registro/i)).not.toBeInTheDocument()
    expect(screen.queryByText('LIC-9988')).not.toBeInTheDocument()
  })

  it('renders not found state when agent does not exist', async () => {
    vi.mocked(agentRepo.fetchAgentProfile).mockResolvedValueOnce(null)
    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValueOnce([])

    render(<AgentProfilePage agentId="invalid-agent" onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Agente no encontrado')).toBeInTheDocument()
    })
  })

  it('does not expose WhatsApp when the public profile has no consented phone', async () => {
    vi.mocked(agentRepo.fetchAgentProfile).mockResolvedValueOnce({
      id: 'agent-private',
      full_name: 'Agente Privado',
      phone: null,
      verification_status: 'verified',
      created_at: new Date().toISOString(),
      active_properties_count: 1,
    })
    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValueOnce([])

    render(<AgentProfilePage agentId="agent-private" onBack={vi.fn()} />)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Este agente no comparte su WhatsApp públicamente.'
    )
    expect(screen.queryByRole('link', { name: 'Contactar por WhatsApp' })).not.toBeInTheDocument()
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
    })

    await waitFor(() => expect(screen.queryByText('Agente Obsoleto')).not.toBeInTheDocument())
  })
})
