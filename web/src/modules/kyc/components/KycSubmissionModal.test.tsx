import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KycSubmissionModal } from './KycSubmissionModal'
import * as kycRepo from '../kycRepository'

const { compressKycImageToWebPMock } = vi.hoisted(() => ({
  compressKycImageToWebPMock: vi.fn(),
}))

vi.mock('../kycRepository')
vi.mock('../kycImageCompression', () => ({
  compressKycImageToWebP: compressKycImageToWebPMock,
}))

describe('KycSubmissionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    compressKycImageToWebPMock.mockImplementation(async (file: File) => (
      new File(['compressed'], `${file.name}.webp`, { type: 'image/webp' })
    ))
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <KycSubmissionModal userId="u1" isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal content when isOpen is true', () => {
    render(<KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(screen.getByText('Solicitud de Verificación KYC')).toBeInTheDocument()
    expect(screen.getByText('Tipo de documento de identidad')).toBeInTheDocument()
  })

  it('allows file selection and calls submit repository functions', async () => {
    const compressedDocument = new File(['compressed-document'], 'carnet.webp', { type: 'image/webp' })
    const compressedSelfie = new File(['compressed-selfie'], 'selfie.webp', { type: 'image/webp' })
    compressKycImageToWebPMock
      .mockResolvedValueOnce(compressedDocument)
      .mockResolvedValueOnce(compressedSelfie)
    vi.mocked(kycRepo.uploadKycImage).mockResolvedValueOnce({
      success: true,
      documentPath: 'u1/private-doc.jpg',
    })
    vi.mocked(kycRepo.uploadKycImage).mockResolvedValueOnce({
      success: true,
      documentPath: 'u1/private-selfie.jpg',
    })
    vi.mocked(kycRepo.submitKycRequest).mockResolvedValueOnce({
      success: true,
      requestId: 'req-1',
    })

    const handleSuccess = vi.fn()
    render(
      <KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />,
    )

    const documentFile = new File(['fake-document'], 'carnet.jpg', { type: 'image/jpeg' })
    const selfieFile = new File(['fake-selfie'], 'selfie.jpg', { type: 'image/jpeg' })
    const documentInput = screen.getByLabelText('Documento de identidad') as HTMLInputElement
    const selfieInput = screen.getByLabelText('Foto sosteniendo el documento') as HTMLInputElement

    fireEvent.change(documentInput, { target: { files: [documentFile] } })
    fireEvent.change(selfieInput, { target: { files: [selfieFile] } })

    const submitBtn = screen.getByRole('button', { name: /Enviar Solicitud/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(compressKycImageToWebPMock).toHaveBeenNthCalledWith(1, documentFile)
      expect(compressKycImageToWebPMock).toHaveBeenNthCalledWith(2, selfieFile)
      expect(kycRepo.uploadKycImage).toHaveBeenNthCalledWith(1, 'u1', compressedDocument, 'document')
      expect(kycRepo.uploadKycImage).toHaveBeenNthCalledWith(2, 'u1', compressedSelfie, 'selfie')
      expect(kycRepo.submitKycRequest).toHaveBeenCalledWith(
        'identity_card',
        'u1/private-doc.jpg',
        'u1/private-selfie.jpg',
      )
    })
  })

  it('does not upload anything when local WebP compression fails', async () => {
    compressKycImageToWebPMock.mockRejectedValueOnce(new Error('decode failed'))

    render(<KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />)

    const documentFile = new File(['fake-document'], 'carnet.jpg', { type: 'image/jpeg' })
    const selfieFile = new File(['fake-selfie'], 'selfie.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Documento de identidad'), { target: { files: [documentFile] } })
    fireEvent.change(screen.getByLabelText('Foto sosteniendo el documento'), { target: { files: [selfieFile] } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar Solicitud/i }))

    expect(await screen.findByText(/No se pudieron optimizar las evidencias/i)).toBeInTheDocument()
    expect(kycRepo.uploadKycImage).not.toHaveBeenCalled()
  })

  it('keeps submission disabled until both identity images are selected', () => {
    render(<KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />)

    const documentFile = new File(['fake-document'], 'carnet.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Documento de identidad'), { target: { files: [documentFile] } })

    expect(screen.getByRole('button', { name: /Enviar Solicitud/i })).toBeDisabled()
  })

  it('removes the first upload when the selfie upload fails', async () => {
    vi.mocked(kycRepo.uploadKycImage)
      .mockResolvedValueOnce({ success: true, documentPath: 'u1/document-private.jpg' })
      .mockResolvedValueOnce({ success: false, error: 'No se pudo subir la selfie.' })
    vi.mocked(kycRepo.removeKycDocument).mockResolvedValueOnce()

    render(<KycSubmissionModal userId="u1" isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />)

    const documentFile = new File(['fake-document'], 'carnet.jpg', { type: 'image/jpeg' })
    const selfieFile = new File(['fake-selfie'], 'selfie.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Documento de identidad'), { target: { files: [documentFile] } })
    fireEvent.change(screen.getByLabelText('Foto sosteniendo el documento'), { target: { files: [selfieFile] } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar Solicitud/i }))

    await waitFor(() => {
      expect(kycRepo.removeKycDocument).toHaveBeenCalledWith('u1/document-private.jpg')
      expect(kycRepo.submitKycRequest).not.toHaveBeenCalled()
    })
  })
})
