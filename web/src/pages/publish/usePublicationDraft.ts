import { useCallback, useEffect, useRef, useState } from 'react'
import { readCompleteDraft, saveCompleteDraft, removeCompleteDraft, type CompletePublicationDraft } from './completeDraftStorage'

/** The form is keyed by owner/property, so no state crosses an identity change. */
export function usePublicationDraft(
  userId: string,
  propertyId: string | undefined,
  waitingForProperty: boolean,
  value: CompletePublicationDraft,
  restore: (draft: CompletePublicationDraft) => void,
  restoreDraft = true,
) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const stopped = useRef(false)
  const pendingSaves = useRef(new Set<Promise<void>>())
  const restoreRef = useRef(restore)
  const latest = useRef(value)

  useEffect(() => {
    restoreRef.current = restore
  }, [restore])

  useEffect(() => {
    latest.current = value
  }, [value])

  useEffect(() => {
    if (waitingForProperty) return
    if (!restoreDraft) {
      setError(null)
      setReady(true)
      return
    }
    let cancelled = false
    readCompleteDraft(userId, propertyId).then(draft => {
      if (cancelled) return
      if (draft) restoreRef.current(draft)
      setError(null)
      setReady(true)
    }).catch(() => {
      if (!cancelled) setError('No se pudo recuperar el borrador. Intenta recuperarlo de nuevo.')
    })
    return () => { cancelled = true }
  }, [userId, propertyId, waitingForProperty, loadAttempt, restoreDraft])

  const retry = useCallback(() => {
    setError(null)
    setReady(false)
    setLoadAttempt(attempt => attempt + 1)
  }, [])

  const save = useCallback(async () => {
    if (!ready || stopped.current) return
    const pendingSave = saveCompleteDraft(userId, latest.current, propertyId)
    pendingSaves.current.add(pendingSave)
    try {
      await pendingSave
      setError(null)
    } catch (cause) {
      setError('No se pudo guardar el borrador en este dispositivo. Mantén esta página abierta e intenta guardar de nuevo.')
      throw cause
    } finally {
      pendingSaves.current.delete(pendingSave)
    }
  }, [userId, propertyId, ready])

  useEffect(() => {
    // No debounce: launch persistence as soon as a committed form change is visible.
    if (ready && !stopped.current) void save().catch(() => {})
  }, [ready, value, save])

  const discard = useCallback(async (stop = true) => {
    const wasStopped = stopped.current
    stopped.current = stop
    try {
      await Promise.allSettled([...pendingSaves.current])
      await removeCompleteDraft(userId, propertyId)
    } catch (cause) {
      stopped.current = wasStopped
      throw cause
    }
  }, [userId, propertyId])

  return { ready, error, save, discard, retry }
}
