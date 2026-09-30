import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PropertyVerificationModerationTab } from './PropertyVerificationModerationTab'
import { usePropertyVerificationModeration } from './usePropertyVerificationModeration'
import type { PendingPropertyVerification } from './propertyVerificationRepository'

vi.mock('./usePropertyVerificationModeration', () => ({
  usePropertyVerificationModeration: vi.fn(),
}))

const mockedUseModeration = vi.mocked(usePropertyVerificationModeration)
const approve = vi.fn()
const openReject = vi.fn()

const request: PendingPropertyVerification = {
  id: 'request-1',
  property_id: 'property-1',
  owner_id: 'owner-1',
  document_type: 'ownership_title',
  document_path: 'owner-1/property-property-1/title.pdf',
  notes: 'Revisar sello del documento.',
  status: 'pending',
  created_at: '2026-09-27T10:00:00Z',
  signed_url: 'https://signed.example/title.pdf',
  trust_score: {
    score: 70,
    identity_verified: true,
    document_verified: false,
    published: true,
    contact_present: true,
    internal_indicator: 'internal_indicator_not_legal_certification',
  },
  properties: { title: 'Casa QA', location: 'Holguín' },
}

function moderationState(requests: PendingPropertyVerification[] = [request]) {
  return {
    requests,
    loading: false,
    error: null,
    actionLoadingId: null,
    notice: null,
    setNotice: vi.fn(),
    rejectingRequest: null,
    setRejectingRequest: vi.fn(),
    rejectionReason: '',
    setRejectionReason: vi.fn(),
    loadPendingRequests: vi.fn(),
    approve,
    openReject,
    confirmReject: vi.fn(),
  }
}

describe('PropertyVerificationModerationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseModeration.mockReturnValue(moderationState())
  })

  it('muestra el indicador interno y conserva la acción de revisión', () => {
    render(<PropertyVerificationModerationTab />)

    expect(screen.getByRole('heading', { name: 'Documentos de propiedad' })).toBeInTheDocument()
    expect(screen.getByText('Casa QA')).toBeInTheDocument()
    expect(screen.getByText('70/100')).toBeInTheDocument()
    expect(screen.getByText('No es una certificación legal.')).toBeInTheDocument()
    expect(screen.getByText('Documento pendiente')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir documento privado/i })).toHaveAttribute('href', request.signed_url)

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    expect(approve).toHaveBeenCalledWith(request)
  })

  it('mantiene la revisión disponible y bloquea aprobar si falta el documento privado', () => {
    mockedUseModeration.mockReturnValue(moderationState([{ ...request, signed_url: null, trust_score: null }]))

    render(<PropertyVerificationModerationTab />)

    expect(screen.getByText('El documento privado no está disponible.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Indicador interno de confianza')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled()
  })
})
