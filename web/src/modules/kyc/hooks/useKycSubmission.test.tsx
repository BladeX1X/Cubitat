import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compressKycImageToWebP } from '../kycImageCompression'
import { removeKycDocument, submitKycRequest, uploadKycImage } from '../kycRepository'
import { useKycSubmission } from './useKycSubmission'

vi.mock('../kycImageCompression', () => ({
  compressKycImageToWebP: vi.fn(),
}))

vi.mock('../kycRepository', () => ({
  removeKycDocument: vi.fn(),
  submitKycRequest: vi.fn(),
  uploadKycImage: vi.fn(),
}))

const documentFile = new File(['document'], 'document.png', { type: 'image/png' })
const selfieFile = new File(['selfie'], 'selfie.png', { type: 'image/png' })

describe('useKycSubmission', () => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  const createObjectUrl = vi.spyOn(URL, 'createObjectURL')
  const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')

  beforeEach(() => {
    vi.clearAllMocks()
    createObjectUrl.mockImplementation((file) => `blob:${(file as File).name}`)
    vi.useRealTimers()
    vi.mocked(compressKycImageToWebP).mockImplementation(async (file) => file)
    vi.mocked(submitKycRequest).mockResolvedValue({ success: true, requestId: 'request-1' })
    vi.mocked(removeKycDocument).mockResolvedValue(undefined)
  })

  it('requires both evidence files before submitting', async () => {
    const { result } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.error).toBe('Por favor selecciona una foto de tu documento de identidad.')
    expect(uploadKycImage).not.toHaveBeenCalled()
  })

  it('rejects unsupported files without uploading them', () => {
    const { result } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    act(() => {
      result.current.selectDocumentFile(new File(['text'], 'note.txt', { type: 'text/plain' }))
    })

    expect(result.current.documentFile).toBeNull()
    expect(result.current.error).toBe('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.')
  })

  it('releases the previous preview immediately when a new file is selected', () => {
    const replacementFile = new File(['replacement'], 'replacement.png', { type: 'image/png' })
    const { result } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    act(() => {
      result.current.selectDocumentFile(documentFile)
      result.current.selectDocumentFile(replacementFile)
    })

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:document.png')
    expect(result.current.documentPreviewUrl).toBe('blob:replacement.png')
  })

  it('releases active previews when the hook unmounts', () => {
    const { result, unmount } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    act(() => {
      result.current.selectDocumentFile(documentFile)
      result.current.selectSelfieFile(selfieFile)
    })
    revokeObjectUrl.mockClear()

    unmount()

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:document.png')
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:selfie.png')
  })

  it('removes the first upload when the selfie upload fails', async () => {
    vi.mocked(uploadKycImage)
      .mockResolvedValueOnce({ success: true, documentPath: 'user-1/document.webp' })
      .mockResolvedValueOnce({ success: false, error: 'No se pudo subir la selfie.' })
    const { result } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    act(() => {
      result.current.selectDocumentFile(documentFile)
      result.current.selectSelfieFile(selfieFile)
    })
    await act(async () => {
      await result.current.submit()
    })

    expect(removeKycDocument).toHaveBeenCalledWith('user-1/document.webp')
    expect(submitKycRequest).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('No se pudo subir la selfie.')
  })

  it('recovers from an unexpected upload exception and leaves loading disabled', async () => {
    vi.mocked(uploadKycImage).mockRejectedValueOnce(new Error('storage unavailable'))
    const { result } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    act(() => {
      result.current.selectDocumentFile(documentFile)
      result.current.selectSelfieFile(selfieFile)
    })
    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('No se pudo completar el envío de la verificación. Inténtalo de nuevo.')
  })

  it('registers a successful request and completes the callbacks', async () => {
    vi.useFakeTimers()
    vi.mocked(uploadKycImage)
      .mockResolvedValueOnce({ success: true, documentPath: 'user-1/document.webp' })
      .mockResolvedValueOnce({ success: true, documentPath: 'user-1/selfie.webp' })
    const { result } = renderHook(() => useKycSubmission({ userId: 'user-1', onClose, onSuccess }))

    act(() => {
      result.current.selectDocumentFile(documentFile)
      result.current.selectSelfieFile(selfieFile)
    })
    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.success).toBe(true)
    expect(submitKycRequest).toHaveBeenCalledWith(
      'identity_card',
      'user-1/document.webp',
      'user-1/selfie.webp',
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
