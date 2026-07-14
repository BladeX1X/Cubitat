import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditLogTab } from './AuditLogTab'

const { useAuditLogMock, loadMock, setActionMock, setSourceMock, setQueryMock } = vi.hoisted(() => ({
  useAuditLogMock: vi.fn(),
  loadMock: vi.fn(),
  setActionMock: vi.fn(),
  setSourceMock: vi.fn(),
  setQueryMock: vi.fn(),
}))

vi.mock('./useAuditLog', () => ({ useAuditLog: useAuditLogMock }))

const event = {
  id: 'audit-1',
  propertyId: 'prop-1',
  propertyOwnerId: 'owner-1',
  propertyTitle: 'Casa en Vedado',
  actorId: 'admin-1',
  actorRole: 'authenticated',
  action: 'update',
  source: 'admin',
  oldStatus: 'pending_review',
  newStatus: 'published',
  oldModerationMessage: null,
  newModerationMessage: 'Revisión completada',
  changedFields: ['status', 'moderation_message'],
  provider: null,
  createdAt: '2026-07-14T12:00:00.000Z',
} as const

function readyState() {
  return {
    events: [event],
    total: 1,
    page: 0,
    loading: false,
    error: null,
    filters: { action: 'all', source: 'all', query: '' },
    setAction: setActionMock,
    setSource: setSourceMock,
    setQuery: setQueryMock,
    load: loadMock,
  }
}

describe('AuditLogTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuditLogMock.mockReturnValue(readyState())
  })

  it('renders the evidence as a mobile card without exposing sensitive data', () => {
    render(<AuditLogTab />)

    expect(screen.getByRole('heading', { name: 'Casa en Vedado' })).toBeInTheDocument()
    expect(screen.getByText('Aprobación manual')).toBeInTheDocument()
    expect(screen.getByText('Pendiente → Publicada')).toBeInTheDocument()
    expect(screen.getByText('Revisión completada')).toBeInTheDocument()
    expect(screen.getByText(/admin-1/)).toBeInTheDocument()
    expect(screen.queryByText(/contact/i)).not.toBeInTheDocument()
  })

  it('keeps error and retry isolated', () => {
    useAuditLogMock.mockReturnValue({ ...readyState(), events: [], loading: false, error: 'RLS denegó la consulta.' })
    render(<AuditLogTab />)

    expect(screen.getByRole('alert')).toHaveTextContent('RLS denegó la consulta.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(loadMock).toHaveBeenCalledWith(0)
  })

  it('represents loading and empty states explicitly', () => {
    useAuditLogMock.mockReturnValue({ ...readyState(), events: [], loading: true })
    const { rerender } = render(<AuditLogTab />)
    expect(screen.getByText('Cargando bitácora…')).toBeInTheDocument()

    useAuditLogMock.mockReturnValue({ ...readyState(), events: [], total: 0 })
    rerender(<AuditLogTab />)
    expect(screen.getByRole('heading', { name: 'Sin eventos' })).toBeInTheDocument()
  })

  it('delegates action and source changes to server-backed filters', async () => {
    render(<AuditLogTab />)

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por acción' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Actualización' }))
    expect(setActionMock).toHaveBeenCalledWith('update')

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por origen' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Automatización' }))
    expect(setSourceMock).toHaveBeenCalledWith('automation')
  })
})
