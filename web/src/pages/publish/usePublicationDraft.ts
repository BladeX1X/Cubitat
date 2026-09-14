import { useCallback, useEffect, useRef, useState } from 'react'
import { readCompleteDraft, saveCompleteDraft, removeCompleteDraft, type CompletePublicationDraft } from './completeDraftStorage'

/** The form is keyed by owner/property, so no state crosses an identity change. */
export function usePublicationDraft(
  userId: string,
  propertyId: string | undefined,
  waitingForProperty: boolean,
  value: CompletePublicationDraft,
  restore: (draft: CompletePublicationDraft) => void,
) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopped = useRef(false)
  const restoreRef = useRef(restore)
  restoreRef.current = restore
  const latest = useRef(value)
  latest.current = value

  useEffect(() => {
    if (waitingForProperty) return
    let cancelled = false
    readCompleteDraft(userId, propertyId).then(draft => {
      if (cancelled) return
      if (draft) restoreRef.current(draft)
      setReady(true)
    }).catch(() => {
      if (!cancelled) setError('No se pudo recuperar el borrador. Recarga antes de editar para conservarlo.')
    })
    return () => { cancelled = true }
  }, [userId, propertyId, waitingForProperty])

  const save = useCallback(async () => {
    if (!ready || stopped.current) return
    try {
      await saveCompleteDraft(userId, latest.current, propertyId)
      setError(null)
    } catch (cause) {
      setError('No se pudo guardar el borrador en este dispositivo. Mantén esta página abierta e intenta guardar de nuevo.')
      throw cause
    }
  }, [userId, propertyId, ready])

  useEffect(() => {
    // No debounce: launch persistence as soon as a committed form change is visible.
    if (ready && !stopped.current) void save().catch(() => {})
  }, [ready, value, save])

  const discard = useCallback(async (stop = true) => {
    stopped.current = stop
    await removeCompleteDraft(userId, propertyId)
  }, [userId, propertyId])

  return { ready, error, save, discard }
}
