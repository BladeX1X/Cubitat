import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KycModerationTab } from './KycModerationTab'
import { fetchPendingKycRequests, reviewKycRequest, type PendingKycRequest } from './kycAdminRepository'

vi.mock('./kycAdminRepository', () => ({
  fetchPendingKycRequests: vi.fn(),
  reviewKycRequest: vi.fn(),
}))

const mockRequests: PendingKycRequest[] = [
  {
    id: 'req-1',
    user_id: 'user-100',
    document_type: 'identity_card',
    document_path: 'user-100/identity.jpg',
    selfie_path: 'user-100/selfie.jpg',
    document_signed_url: 'https://example.com/identity.jpg',
    selfie_signed_url: 'https://example.com/selfie.jpg',
    status: 'pending',
    rejection_reason: null,
    created_at: '2026-07-21T12:00:00.000Z',
    full_name: 'Carlos Ruiz',
    email: 'carlos@example.com',
  },
  {
    id: 'req-2',
    user_id: 'user-200',
    document_type: 'passport',
    document_path: 'user-200/passport.jpg',
    selfie_path: 'user-200/selfie.jpg',
    document_signed_url: 'https://example.com/passport.jpg',
    selfie_signed_url: 'https://example.com/selfie-2.jpg',
    status: 'pending',
    rejection_reason: null,
    created_at: '2026-07-21T14:00:00.000Z',
    full_name: 'Ana Gómez',
    email: 'ana@example.com',
  },
]

describe('KycModerationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchPendingKycRequests).mockResolvedValue(mockRequests)
    vi.mocked(reviewKycRequest).mockResolvedValue(undefined)
  })

  it('renders loading state initially', () => {
    vi.mocked(fetchPendingKycRequests).mockImplementation(
      () => new Promise(() => {}), // stays pending
    )

    render(<KycModerationTab />)
    expect(screen.getByText(/cargando solicitudes kyc pendientes/i)).toBeInTheDocument()
  })

  it('renders error state and handles retry button', async () => {
    vi.mocked(fetchPendingKycRequests)
      .mockRejectedValueOnce(new Error('Error de red al consultar solicitudes'))
      .mockResolvedValueOnce(mockRequests)

    render(<KycModerationTab />)

    await waitFor(() => {
      expect(screen.getByText('Error de red al consultar solicitudes')).toBeInTheDocument()
    })

    const retryButton = screen.getByRole('button', { name: /reintentar/i })
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
      expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    })

    expect(fetchPendingKycRequests).toHaveBeenCalledTimes(2)
  })

  it('renders empty state when there are no pending requests', async () => {
    vi.mocked(fetchPendingKycRequests).mockResolvedValue([])

    render(<KycModerationTab />)

    await waitFor(() => {
      expect(screen.getByText(/no hay solicitudes kyc pendientes/i)).toBeInTheDocument()
    })
  })

  it('displays list of pending requests with document image and info', async () => {
    render(<KycModerationTab />)

    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
      expect(screen.getByText('carlos@example.com')).toBeInTheDocument()
      expect(screen.getByText('Carné de Identidad')).toBeInTheDocument()

      expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
      expect(screen.getByText('ana@example.com')).toBeInTheDocument()
      expect(screen.getByText('Pasaporte')).toBeInTheDocument()
    })

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(4)
    expect(images[0]).toHaveAttribute('src', 'https://example.com/identity.jpg')
    expect(images[1]).toHaveAttribute('src', 'https://example.com/selfie.jpg')
    expect(images[2]).toHaveAttribute('src', 'https://example.com/passport.jpg')
    expect(images[3]).toHaveAttribute('src', 'https://example.com/selfie-2.jpg')
  })

  it('approves a request when clicking Aprobar', async () => {
    render(<KycModerationTab />)

    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByRole('button', { name: /aprobar/i })
    fireEvent.click(approveButtons[0])

    await waitFor(() => {
      expect(reviewKycRequest).toHaveBeenCalledWith('req-1', 'approved')
      expect(screen.queryByText('Carlos Ruiz')).not.toBeInTheDocument()
      expect(screen.getByText('Solicitud KYC aprobada exitosamente.')).toBeInTheDocument()
    })
  })

  it('keeps the request visible and shows a safe error when approval fails', async () => {
    vi.mocked(reviewKycRequest).mockRejectedValueOnce(new Error('No se pudo procesar la solicitud KYC.'))

    render(<KycModerationTab />)

    const approveButton = (await screen.findAllByRole('button', { name: /aprobar/i }))[0]
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(reviewKycRequest).toHaveBeenCalledWith('req-1', 'approved')
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
      expect(screen.getByText('No se pudo procesar la solicitud KYC.')).toBeInTheDocument()
    })
  })

  it('disables approval when the selfie evidence is unavailable', async () => {
    vi.mocked(fetchPendingKycRequests).mockResolvedValueOnce([
      { ...mockRequests[0], selfie_path: null, selfie_signed_url: null },
    ])

    render(<KycModerationTab />)

    const approveButton = await screen.findByRole('button', { name: /aprobar/i })
    expect(approveButton).toBeDisabled()
    expect(screen.getByText(/evidencia privada no está disponible/i)).toBeInTheDocument()
  })

  it('disables approval when the identity document evidence is unavailable', async () => {
    vi.mocked(fetchPendingKycRequests).mockResolvedValueOnce([
      { ...mockRequests[0], document_signed_url: null },
    ])

    render(<KycModerationTab />)

    const approveButton = await screen.findByRole('button', { name: /aprobar/i })
    expect(approveButton).toBeDisabled()
    expect(screen.getByText(/evidencia privada no está disponible/i)).toBeInTheDocument()
  })

  it('opens rejection modal, inputs reason, and approves rejection', async () => {
    render(<KycModerationTab />)

    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    })

    const rejectButtons = screen.getAllByRole('button', { name: /rechazar/i })
    fireEvent.click(rejectButtons[0])

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/rechazar solicitud kyc/i)).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(/documento de identidad se encuentra borroso/i)
    fireEvent.change(textarea, { target: { value: 'La imagen no es legible' } })

    const confirmRejectButton = screen.getByRole('button', { name: /confirmar rechazo/i })
    fireEvent.click(confirmRejectButton)

    await waitFor(() => {
      expect(reviewKycRequest).toHaveBeenCalledWith('req-1', 'rejected', 'La imagen no es legible')
      expect(screen.queryByText('Carlos Ruiz')).not.toBeInTheDocument()
      expect(screen.getByText('Solicitud KYC rechazada exitosamente.')).toBeInTheDocument()
    })
  })

  it('closes rejection modal when clicking Cancelar', async () => {
    render(<KycModerationTab />)

    await waitFor(() => {
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    })

    const rejectButtons = screen.getAllByRole('button', { name: /rechazar/i })
    fireEvent.click(rejectButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(reviewKycRequest).not.toHaveBeenCalled()
  })
})
