import { useCallback, useEffect, useState } from 'react'
import { fetchPendingPropertyVerifications, reviewPropertyVerification, type PendingPropertyVerification } from './propertyVerificationRepository'

export function usePropertyVerificationModeration() {
  const [requests, setRequests] = useState<PendingPropertyVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<PendingPropertyVerification | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadPendingRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRequests(await fetchPendingPropertyVerifications())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las verificaciones documentales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadPendingRequests() }, [loadPendingRequests])

  async function approve(request: PendingPropertyVerification) {
    setActionLoadingId(request.id)
    try {
      await reviewPropertyVerification(request.id, 'approved')
      setRequests((current) => current.filter((item) => item.id !== request.id))
      setNotice('Verificación documental aprobada.')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'No se pudo aprobar la verificación documental.')
    } finally {
      setActionLoadingId(null)
    }
  }

  function openReject(request: PendingPropertyVerification) {
    setRejectingRequest(request)
    setRejectionReason('')
  }

  async function confirmReject() {
    if (!rejectingRequest || !rejectionReason.trim()) return
    const requestId = rejectingRequest.id
    setActionLoadingId(requestId)
    try {
      await reviewPropertyVerification(requestId, 'rejected', rejectionReason.trim())
      setRequests((current) => current.filter((item) => item.id !== requestId))
      setRejectingRequest(null)
      setRejectionReason('')
      setNotice('Verificación documental rechazada.')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'No se pudo rechazar la verificación documental.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return {
    requests, loading, error, actionLoadingId, notice, setNotice, rejectingRequest,
    setRejectingRequest, rejectionReason, setRejectionReason, loadPendingRequests,
    approve, openReject, confirmReject,
  }
}
