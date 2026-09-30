import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KycRejectDialog } from './KycRejectDialog'
import type { PendingKycRequest } from './kycAdminRepository'

const request: PendingKycRequest = {
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
}

describe('KycRejectDialog', () => {
  it('does not render without a selected request', () => {
    const { container } = render(
      <KycRejectDialog
        request={null}
        reason=""
        isProcessing={false}
        onReasonChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('requires a reason before confirming and reports the edited reason', () => {
    const onReasonChange = vi.fn()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <KycRejectDialog
        request={request}
        reason=""
        isProcessing={false}
        onReasonChange={onReasonChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: /confirmar rechazo/i })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/motivo del rechazo/i), {
      target: { value: 'Documento borroso' },
    })
    expect(onReasonChange).toHaveBeenCalledWith('Documento borroso')

    render(
      <KycRejectDialog
        request={request}
        reason="Documento borroso"
        isProcessing={false}
        onReasonChange={onReasonChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /confirmar rechazo/i })[1])
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole('button', { name: /cancelar/i })[1])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both actions while processing', () => {
    render(
      <KycRejectDialog
        request={request}
        reason="Documento vencido"
        isProcessing
        onReasonChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled()
    expect(screen.getAllByRole('button')[1]).toBeDisabled()
  })
})
