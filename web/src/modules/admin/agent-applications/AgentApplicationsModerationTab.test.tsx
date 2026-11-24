import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentApplicationsModerationTab } from './AgentApplicationsModerationTab'

const repository = vi.hoisted(() => ({
  fetchPendingAgentApplications: vi.fn(),
  fetchRejectedAgentApplicationEvents: vi.fn(),
  fetchActiveAgentsForModeration: vi.fn(),
  revokeAgentAccess: vi.fn(),
  fetchAgentApplicationDocumentLinks: vi.fn(),
  reviewAgentApplication: vi.fn(),
}))

vi.mock('./agentApplicationsRepository', () => ({ ...repository, AGENT_APPLICATIONS_PAGE_SIZE: 20 }))

const application = {
  id: '45c8e993-b64a-4d1c-9e58-20ad1a25eb6b',
  user_id: 'f7adba7c-367d-42a8-933a-af01f7f9155a',
  province: 'La Habana',
  education_title: 'Licenciatura en Derecho',
  experience_summary: 'Experiencia en gestión documental.',
  status: 'submitted' as const,
  created_at: '2026-11-03T18:00:00.000Z',
}

const activeAgent = {
  agent_id: '27e46228-8bb3-4da9-a9d3-1a1bf0d29f75',
  full_name: 'Agente QA',
  province: 'La Habana',
  assigned_at: '2026-11-03T18:00:00.000Z',
}

describe('AgentApplicationsModerationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.fetchPendingAgentApplications.mockResolvedValue({ items: [application], total: 1 })
    repository.fetchRejectedAgentApplicationEvents.mockResolvedValue({ items: [], total: 0 })
    repository.fetchActiveAgentsForModeration.mockResolvedValue([activeAgent])
    repository.revokeAgentAccess.mockResolvedValue(undefined)
    repository.fetchAgentApplicationDocumentLinks.mockResolvedValue({
      cv_url: 'https://supabase.example/cv?token=short',
      diploma_url: 'https://supabase.example/diploma?token=short',
      expires_in: 120,
    })
    repository.reviewAgentApplication.mockResolvedValue(undefined)
  })

  it('lists application details and requests private links only after the moderator opens documents', async () => {
    render(<AgentApplicationsModerationTab />)

    expect(await screen.findByText('Licenciatura en Derecho')).toBeInTheDocument()
    expect(screen.getByText(/La Habana · Recibida/)).toBeInTheDocument()
    expect(repository.fetchAgentApplicationDocumentLinks).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ver documentos' }))
    expect(await screen.findByRole('link', { name: 'Abrir currículum' })).toHaveAttribute('href', 'https://supabase.example/cv?token=short')
    expect(screen.getByRole('link', { name: 'Abrir título' })).toHaveAttribute('href', 'https://supabase.example/diploma?token=short')
    expect(repository.fetchAgentApplicationDocumentLinks).toHaveBeenCalledWith(application.id)
  })

  it('explains that admin permission is missing when the protected endpoint denies the document request', async () => {
    repository.fetchAgentApplicationDocumentLinks.mockRejectedValue(new Error('No tienes permiso de administrador para abrir estos documentos.'))
    render(<AgentApplicationsModerationTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ver documentos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/permiso de administrador/i)
  })

  it('provides an empty state when the review queue has no applications', async () => {
    repository.fetchPendingAgentApplications.mockResolvedValue({ items: [], total: 0 })
    render(<AgentApplicationsModerationTab />)

    await waitFor(() => expect(screen.getByText('No hay postulaciones pendientes')).toBeInTheDocument())
  })

  it('requires a reason and revokes access without presenting account deletion', async () => {
    render(<AgentApplicationsModerationTab />)

    expect(await screen.findByText('Agente QA')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retirar acceso' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar retiro' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Motivo para retirar el acceso'), { target: { value: 'Incumplimiento de las reglas.' } })
    fireEvent.click(confirm)

    await waitFor(() => expect(repository.revokeAgentAccess).toHaveBeenCalledWith(activeAgent.agent_id, 'Incumplimiento de las reglas.'))
    expect(await screen.findByRole('status')).toHaveTextContent(/cuenta y anuncios se conservaron/i)
  })

  it('starts review through the AAL2-protected RPC repository action', async () => {
    render(<AgentApplicationsModerationTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar revisión' }))
    await waitFor(() => expect(repository.reviewAgentApplication).toHaveBeenCalledWith(application.id, 'reviewing', undefined))
    expect(repository.fetchPendingAgentApplications).toHaveBeenCalledTimes(2)
  })

  it('shows when an approval receives a province place', async () => {
    repository.reviewAgentApplication.mockResolvedValueOnce('approved')
    render(<AgentApplicationsModerationTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar y asignar plaza' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/plaza provincial asignada/i)
    expect(repository.reviewAgentApplication).toHaveBeenCalledWith(application.id, 'approved', undefined)
  })

  it('explains that a full province keeps an approved candidate waitlisted', async () => {
    repository.reviewAgentApplication.mockResolvedValueOnce('waitlisted')
    render(<AgentApplicationsModerationTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar y asignar plaza' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/cuatro agentes activos.*lista de espera/i)
  })

  it('requires a reason before making a final rejection decision', async () => {
    render(<AgentApplicationsModerationTab />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))

    const confirmButton = screen.getByRole('button', { name: 'Confirmar rechazo' })
    expect(confirmButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: 'No cumple el requisito de formación.' } })
    fireEvent.click(confirmButton)

    await waitFor(() => expect(repository.reviewAgentApplication).toHaveBeenCalledWith(
      application.id,
      'rejected',
      'No cumple el requisito de formación.',
    ))
  })

  it('shows rejection notes in the private moderation history only', async () => {
    repository.fetchPendingAgentApplications.mockResolvedValue({ items: [], total: 0 })
    repository.fetchRejectedAgentApplicationEvents.mockResolvedValue({
      items: [{
        application_id: application.id,
        to_status: 'rejected',
        reason: 'Falta acreditar el título requerido.',
        created_at: '2026-11-04T18:00:00.000Z',
        agent_applications: { education_title: 'Licenciatura en Derecho', province: 'La Habana' },
      }],
      total: 1,
    })
    render(<AgentApplicationsModerationTab />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }))

    expect(await screen.findByText('Falta acreditar el título requerido.')).toBeInTheDocument()
    expect(repository.fetchRejectedAgentApplicationEvents).toHaveBeenCalledWith(0)
    expect(screen.getByText(/Los motivos solo son visibles para moderación autorizada/)).toBeInTheDocument()
  })
})
