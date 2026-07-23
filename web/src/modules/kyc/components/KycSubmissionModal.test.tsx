import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KycSubmissionModal } from './KycSubmissionModal'
import * as kycRepo from '../kycRepository'

vi.mock('../kycRepository')

describe('KycSubmissionModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <KycSubmissionModal userId="u1" isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal content when isOpen is true', () => {
    render(<KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.getByText('Solicitud de Verificación KYC')).toBeInTheDocument()
    expect(screen.getByText('Tipo de Documento')).toBeInTheDocument()
  })

  it('allows file selection and calls submit repository functions', async () => {
    vi.mocked(kycRepo.uploadKycDocument).mockResolvedValueOnce({
      success: true,
      documentPath: 'u1/private-doc.jpg',
    })
    vi.mocked(kycRepo.submitKycRequest).mockResolvedValueOnce({
      success: true,
      requestId: 'req-1',
    })

    const handleSuccess = vi.fn()
    render(
      <KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />,
    )

    const file = new File(['fake-image'], 'carnet.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/Foto del Documento/i) as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    const submitBtn = screen.getByRole('button', { name: /Enviar Solicitud/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(kycRepo.uploadKycDocument).toHaveBeenCalledWith('u1', file)
      expect(kycRepo.submitKycRequest).toHaveBeenCalledWith('identity_card', 'u1/private-doc.jpg')
    })
  })
})
