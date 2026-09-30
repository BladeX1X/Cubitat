import { useEffect, useRef, useState } from 'react'
import { compressKycImageToWebP } from '../kycImageCompression'
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
  const documentPreviewUrlRef = useRef<string | null>(null)
  const selfiePreviewUrlRef = useRef<string | null>(null)

  useEffect(() => () => {
    if (documentPreviewUrlRef.current) URL.revokeObjectURL(documentPreviewUrlRef.current)
    if (selfiePreviewUrlRef.current) URL.revokeObjectURL(selfiePreviewUrlRef.current)
  }, [])

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
    if (documentPreviewUrlRef.current) URL.revokeObjectURL(documentPreviewUrlRef.current)
    const nextPreviewUrl = URL.createObjectURL(selected)
    documentPreviewUrlRef.current = nextPreviewUrl
    setDocumentFile(selected)
    setDocumentPreviewUrl(nextPreviewUrl)
  }

  function selectSelfieFile(selected: File | undefined) {
    if (!validateFile(selected)) return
    if (selfiePreviewUrlRef.current) URL.revokeObjectURL(selfiePreviewUrlRef.current)
    const nextPreviewUrl = URL.createObjectURL(selected)
    selfiePreviewUrlRef.current = nextPreviewUrl
    setSelfieFile(selected)
    setSelfiePreviewUrl(nextPreviewUrl)
  }

  function clearDocumentFile() {
    if (documentPreviewUrlRef.current) URL.revokeObjectURL(documentPreviewUrlRef.current)
    documentPreviewUrlRef.current = null
    setDocumentFile(null)
    setDocumentPreviewUrl(null)
  }

  function clearSelfieFile() {
    if (selfiePreviewUrlRef.current) URL.revokeObjectURL(selfiePreviewUrlRef.current)
    selfiePreviewUrlRef.current = null
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
    let documentPath: string | undefined
    let selfiePath: string | undefined

    try {
      let compressedDocument: File
      let compressedSelfie: File
      try {
        ;[compressedDocument, compressedSelfie] = await Promise.all([
          compressKycImageToWebP(documentFile),
          compressKycImageToWebP(selfieFile),
        ])
      } catch {
        setError('No se pudieron optimizar las evidencias. Inténtalo con otras imágenes.')
        return
      }

      const documentUpload = await uploadKycImage(userId, compressedDocument, 'document')
      if (!documentUpload.success || !documentUpload.documentPath) {
        setError(documentUpload.error || 'Error al subir la imagen del documento.')
        return
      }
      documentPath = documentUpload.documentPath

      const selfieUpload = await uploadKycImage(userId, compressedSelfie, 'selfie')
      if (!selfieUpload.success || !selfieUpload.documentPath) {
        await removeKycDocument(documentPath)
        documentPath = undefined
        setError(selfieUpload.error || 'Error al subir la foto sosteniendo el documento.')
        return
      }
      selfiePath = selfieUpload.documentPath

      const submitResult = await submitKycRequest(documentType, documentPath, selfiePath)
      if (!submitResult.success) {
        await Promise.all([removeKycDocument(documentPath), removeKycDocument(selfiePath)])
        documentPath = undefined
        selfiePath = undefined
        setError(submitResult.error || 'No se pudo registrar la solicitud de verificación.')
        return
      }

      setSuccess(true)
      completionTimer.current = setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch {
      await Promise.all([
        documentPath ? removeKycDocument(documentPath) : Promise.resolve(),
        selfiePath ? removeKycDocument(selfiePath) : Promise.resolve(),
      ])
      setError('No se pudo completar el envío de la verificación. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
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
