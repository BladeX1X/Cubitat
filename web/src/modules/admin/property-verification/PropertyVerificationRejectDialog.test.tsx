import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PropertyVerificationRejectDialog } from './PropertyVerificationRejectDialog'
import type { PendingPropertyVerification } from './propertyVerificationRepository'

const request: PendingPropertyVerification = {
  id: 'request-1',
  property_id: 'property-1',
  owner_id: 'owner-1',
  document_type: 'ownership_title',
  document_path: 'owner-1/property-property-1/title.pdf',
  notes: null,
  status: 'pending',
  created_at: '2026-09-27T10:00:00Z',
  signed_url: null,
  trust_score: null,
  properties: { title: 'Casa QA', location: 'Holguín' },
}

describe('PropertyVerificationRejectDialog', () => {
  it('does not render without a selected request', () => {
    const { container } = render(
      <PropertyVerificationRejectDialog
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

  it('requires a reason and forwards cancel and confirm actions', () => {
    const onReasonChange = vi.fn()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <PropertyVerificationRejectDialog
        request={request}
        reason=""
        isProcessing={false}
        onReasonChange={onReasonChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    const confirm = screen.getByRole('button', { name: 'Rechazar' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Motivo del rechazo' }), { target: { value: 'Documento ilegible' } })
    expect(onReasonChange).toHaveBeenCalledWith('Documento ilegible')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('confirms with a non-empty reason and disables actions while processing', () => {
    const onConfirm = vi.fn()

    const { rerender } = render(
      <PropertyVerificationRejectDialog
        request={request}
        reason="Documento ilegible"
        isProcessing={true}
        onReasonChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    rerender(
      <PropertyVerificationRejectDialog
        request={request}
        reason="Documento ilegible"
        isProcessing={false}
        onReasonChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
