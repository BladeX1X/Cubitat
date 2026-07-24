import { useEffect, useRef, useState } from 'react'
import { removeKycDocument, submitKycRequest, uploadKycImage } from '../kycRepository'

export type KycDocumentType = 'identity_card' | 'passport'

export function isKycDocumentType(value: string): value is KycDocumentType {
  return value === 'identity_card' || value === 'passport'
}

interface UseKycSubmissionOptions {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export function useKycSubmission({ userId, onClose, onSuccess }: UseKycSubmissionOptions) {
  const [documentType, setDocumentType] = useState<KycDocumentType>('identity_card')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl)
  }, [documentPreviewUrl])

  useEffect(() => () => {
    if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl)
  }, [selfiePreviewUrl])

  useEffect(() => () => {
    if (completionTimer.current) clearTimeout(completionTimer.current)
  }, [])

  function validateFile(selected: File | undefined): selected is File {
    if (!selected) return false
    if (!ACCEPTED_IMAGE_TYPES.includes(selected.type) || selected.size > MAX_IMAGE_SIZE) {
      setError('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.')
      return false
    }
    setError(null)
    return true
  }

  function selectDocumentFile(selected: File | undefined) {
    if (!validateFile(selected)) return
    setDocumentFile(selected)
    setDocumentPreviewUrl(URL.createObjectURL(selected))
  }

  function selectSelfieFile(selected: File | undefined) {
    if (!validateFile(selected)) return
    setSelfieFile(selected)
    setSelfiePreviewUrl(URL.createObjectURL(selected))
  }

  function clearDocumentFile() {
    setDocumentFile(null)
    setDocumentPreviewUrl(null)
  }

  function clearSelfieFile() {
    setSelfieFile(null)
    setSelfiePreviewUrl(null)
  }

  async function submit() {
    if (!documentFile) {
      setError('Por favor selecciona una foto de tu documento de identidad.')
      return
    }
    if (!selfieFile) {
      setError('Por favor añade una foto tuya sosteniendo el documento de identidad.')
      return
    }

    setLoading(true)
    setError(null)
    const documentUpload = await uploadKycImage(userId, documentFile, 'document')
    if (!documentUpload.success || !documentUpload.documentPath) {
      setError(documentUpload.error || 'Error al subir la imagen del documento.')
      setLoading(false)
      return
    }

    const selfieUpload = await uploadKycImage(userId, selfieFile, 'selfie')
    if (!selfieUpload.success || !selfieUpload.documentPath) {
      await removeKycDocument(documentUpload.documentPath)
      setError(selfieUpload.error || 'Error al subir la foto sosteniendo el documento.')
      setLoading(false)
      return
    }

    const submitResult = await submitKycRequest(
      documentType,
      documentUpload.documentPath,
      selfieUpload.documentPath,
    )
    setLoading(false)
    if (!submitResult.success) {
      await Promise.all([
        removeKycDocument(documentUpload.documentPath),
        removeKycDocument(selfieUpload.documentPath),
      ])
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
    documentFile,
    documentPreviewUrl,
    selfieFile,
    selfiePreviewUrl,
    loading,
    error,
    success,
    selectDocumentFile,
    selectSelfieFile,
    clearDocumentFile,
    clearSelfieFile,
    submit,
  }
}
