import { useCallback, useEffect, useState } from 'react'
import { fetchPendingKycRequests, reviewKycRequest, type PendingKycRequest } from './kycAdminRepository'

export function useKycModeration() {
  const [requests, setRequests] = useState<PendingKycRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<PendingKycRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadPendingRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRequests(await fetchPendingKycRequests())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes KYC pendientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPendingRequests()
  }, [loadPendingRequests])

  async function approve(request: PendingKycRequest) {
    setActionLoadingId(request.id)
    try {
      await reviewKycRequest(request.id, 'approved')
      setRequests((current) => current.filter((item) => item.id !== request.id))
      setNotice('Solicitud KYC aprobada exitosamente.')
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Error al aprobar la solicitud KYC.')
    } finally {
      setActionLoadingId(null)
    }
  }

  function openReject(request: PendingKycRequest) {
    setRejectingRequest(request)
    setRejectionReason('')
  }

  async function confirmReject() {
    if (!rejectingRequest) return
    const requestId = rejectingRequest.id
    setActionLoadingId(requestId)
    try {
      await reviewKycRequest(requestId, 'rejected', rejectionReason.trim() || undefined)
      setRequests((current) => current.filter((item) => item.id !== requestId))
      setRejectingRequest(null)
      setRejectionReason('')
      setNotice('Solicitud KYC rechazada exitosamente.')
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Error al rechazar la solicitud KYC.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return {
    requests,
    loading,
    error,
    actionLoadingId,
    notice,
    setNotice,
    rejectingRequest,
    setRejectingRequest,
    rejectionReason,
    setRejectionReason,
    loadPendingRequests,
    approve,
    openReject,
    confirmReject,
  }
}
