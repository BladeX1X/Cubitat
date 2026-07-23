import { useEffect, useRef, useState } from 'react'
import { removeKycDocument, submitKycRequest, uploadKycDocument } from '../kycRepository'

export type KycDocumentType = 'identity_card' | 'license' | 'passport'

export function isKycDocumentType(value: string): value is KycDocumentType {
  return value === 'identity_card' || value === 'license' || value === 'passport'
}

interface UseKycSubmissionOptions {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export function useKycSubmission({ userId, onClose, onSuccess }: UseKycSubmissionOptions) {
  const [documentType, setDocumentType] = useState<KycDocumentType>('identity_card')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => () => {
    if (completionTimer.current) clearTimeout(completionTimer.current)
  }, [])

  function selectFile(selected: File | undefined) {
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 10 * 1024 * 1024) {
      setError('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.')
      return
    }
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setError(null)
  }

  function clearFile() {
    setFile(null)
    setPreviewUrl(null)
  }

  async function submit() {
    if (!file) {
      setError('Por favor selecciona una foto de tu documento de identidad.')
      return
    }

    setLoading(true)
    setError(null)
    const uploadResult = await uploadKycDocument(userId, file)
    if (!uploadResult.success || !uploadResult.documentPath) {
      setError(uploadResult.error || 'Error al subir la imagen del documento.')
      setLoading(false)
      return
    }

    const submitResult = await submitKycRequest(documentType, uploadResult.documentPath)
    setLoading(false)
    if (!submitResult.success) {
      await removeKycDocument(uploadResult.documentPath)
      setError(submitResult.error || 'No se pudo registrar la solicitud de verificación.')
      return
    }

    setSuccess(true)
    completionTimer.current = setTimeout(() => {
      onSuccess()
      onClose()
    }, 2000)
  }

  return {
    documentType,
    setDocumentType,
    file,
    previewUrl,
    loading,
    error,
    success,
    selectFile,
    clearFile,
    submit,
  }
}
