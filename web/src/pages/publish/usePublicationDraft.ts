import { useCallback, useEffect, useRef, useState } from 'react'
import { getCompleteDraftGeneration, readCompleteDraft, saveCompleteDraft, removeCompleteDraft, type CompletePublicationDraft } from './completeDraftStorage'
import { removeLegacyPublicationDraft } from './draftStorage'

/** The form is keyed by owner/property, so no state crosses an identity change. */
export function usePublicationDraft(
  userId: string,
  propertyId: string | undefined,
  waitingForProperty: boolean,
  value: CompletePublicationDraft,
  restore: (draft: CompletePublicationDraft) => void,
  restoreDraft = true,
  draftId?: string,
) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const stopped = useRef(false)
  const generation = useRef(getCompleteDraftGeneration(userId, propertyId, draftId))
  const pendingSaves = useRef(new Set<Promise<void>>())
  const savedAtEntry = useRef<CompletePublicationDraft | null>(null)
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
      // Starting a fresh property must not leave an ownerless legacy draft in
      // this browser or make it available to a later account/session.
      removeLegacyPublicationDraft()
      setError(null)
      setReady(true)
      return
    }
    let cancelled = false;
    (draftId ? readCompleteDraft(userId, propertyId, draftId) : readCompleteDraft(userId, propertyId)).then(draft => {
      if (cancelled) return
      savedAtEntry.current = draft
      if (draft) restoreRef.current(draft)
      setError(null)
      setReady(true)
    }).catch(() => {
      if (!cancelled) setError('No se pudo recuperar el borrador. Intenta recuperarlo de nuevo.')
    })
    return () => { cancelled = true }
  }, [userId, propertyId, waitingForProperty, loadAttempt, restoreDraft, draftId])

  const retry = useCallback(() => {
    setError(null)
    setReady(false)
    setLoadAttempt(attempt => attempt + 1)
  }, [])

  const save = useCallback(async (markAsSaved = false) => {
    if (!ready || stopped.current) return
    const snapshot = structuredClone(latest.current)
    const pendingSave = draftId
      ? saveCompleteDraft(userId, snapshot, propertyId, draftId, generation.current)
      : saveCompleteDraft(userId, snapshot, propertyId)
    pendingSaves.current.add(pendingSave)
    try {
      await pendingSave
      if (markAsSaved) savedAtEntry.current = snapshot
      setError(null)
    } catch (cause) {
      setError('No se pudo guardar el borrador en este dispositivo. Mantén esta página abierta e intenta guardar de nuevo.')
      throw cause
    } finally {
      pendingSaves.current.delete(pendingSave)
    }
  }, [userId, propertyId, ready, draftId])

  useEffect(() => {
    // No debounce: launch persistence as soon as a committed form change is visible.
    if (ready && !stopped.current) void save().catch(() => {})
  }, [ready, value, save])

  const discard = useCallback(async (stop = true) => {
    const wasStopped = stopped.current
    stopped.current = stop
    try {
      await Promise.allSettled([...pendingSaves.current])
      if (draftId) await removeCompleteDraft(userId, propertyId, draftId)
      else await removeCompleteDraft(userId, propertyId)
      if (!stop) generation.current = getCompleteDraftGeneration(userId, propertyId, draftId)
    } catch (cause) {
      stopped.current = wasStopped
      throw cause
    }
  }, [userId, propertyId, draftId])

  const restoreSavedDraft = useCallback(async () => {
    const wasStopped = stopped.current
    stopped.current = true
    try {
      await Promise.allSettled([...pendingSaves.current])
      if (savedAtEntry.current) {
        if (draftId) await saveCompleteDraft(userId, savedAtEntry.current, propertyId, draftId, generation.current)
        else await saveCompleteDraft(userId, savedAtEntry.current, propertyId)
      } else if (draftId) await removeCompleteDraft(userId, propertyId, draftId)
      else await removeCompleteDraft(userId, propertyId)
    } catch (cause) {
      stopped.current = wasStopped
      throw cause
    }
  }, [userId, propertyId, draftId])

  return { ready, error, save, discard, restoreSavedDraft, retry }
}
