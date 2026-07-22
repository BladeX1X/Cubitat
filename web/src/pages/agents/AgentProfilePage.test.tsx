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
    })

    vi.mocked(agentRepo.fetchAgentProperties).mockResolvedValueOnce([
      {
        id: 'p1',
        title: 'Apartamento de lujo en Miramar',
        location: 'Playa, La Habana',
        priceUsd: 85000,
        coverImage: '',
        status: 'published',
        operation: 'venta',
        propertyType: 'apartamento',
        description: 'Hermoso apartamento',
        zoneId: 'playa',
        bedrooms: 2,
        bathrooms: 2,
        parking: 1,
        areaM2: 110,
        amenities: [],
        coverTone: '#ffffff',
        mapPoint: { x: 0, y: 0 },
        coordinates: { latitude: 23.1, longitude: -82.3 },
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
})
